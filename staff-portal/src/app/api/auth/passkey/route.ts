import { NextRequest, NextResponse } from "next/server";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
  type WebAuthnCredential,
} from "@simplewebauthn/server";
import { clientIp, lockedUntil, recordAttempt } from "@/lib/auth-server";
import { query, withTransaction } from "@/lib/db";
import { logActivity } from "@/lib/api-auth";
import { getStaffSession } from "@/lib/session";
import { openStaffSession } from "@/lib/staff-session-server";

type CredentialRow = {
  credential_id: string;
  user_id: string;
  public_key: Buffer;
  counter: string;
  transports: string[];
  device_type: "singleDevice" | "multiDevice";
};

function relyingParty() {
  const portal = process.env.NEXT_PUBLIC_PORTAL_URL?.trim();
  if (!portal) throw new Error("NEXT_PUBLIC_PORTAL_URL is required for passkeys");
  const url = new URL(portal);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("Passkeys require an HTTPS portal URL in production");
  }
  return { origin: url.origin, rpID: url.hostname };
}

function validCredentialResponse(value: unknown): value is AuthenticationResponseJSON | RegistrationResponseJSON {
  if (!value || typeof value !== "object") return false;
  const response = value as Record<string, unknown>;
  return typeof response.id === "string" && response.id.length > 0 && response.id.length <= 1024 &&
    typeof response.rawId === "string" && response.response !== null && typeof response.response === "object";
}

async function consumeChallenge(purpose: "authentication" | "registration", userId: string | null, challenge: string) {
  const result = await query<{ challenge: string }>(
    `DELETE FROM webauthn_challenges
     WHERE purpose = $1 AND user_id IS NOT DISTINCT FROM $2::uuid
       AND challenge = $3 AND expires_at > now()
     RETURNING challenge`,
    [purpose, userId, challenge],
  );
  return result.rows[0]?.challenge ?? null;
}

async function saveChallenge(challenge: string, purpose: "authentication" | "registration", userId: string | null) {
  await query("DELETE FROM webauthn_challenges WHERE expires_at <= now()");
  await query(
    `INSERT INTO webauthn_challenges (challenge, purpose, user_id, expires_at)
     VALUES ($1, $2, $3, now() + interval '5 minutes')`,
    [challenge, purpose, userId],
  );
}

function authError(status = 401) {
  return NextResponse.json({ error: "The passkey was not accepted." }, { status });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as {
    action?: unknown;
    response?: unknown;
    challenge?: unknown;
    credentialId?: unknown;
  } | null;
  if (!body || typeof body.action !== "string") {
    return NextResponse.json({ error: "Invalid passkey request." }, { status: 400 });
  }
  const action = body.action;
  const ip = clientIp(req);

  if (action === "authentication-options") {
    const { rpID } = relyingParty();
    const options = await generateAuthenticationOptions({ rpID, userVerification: "required" });
    await saveChallenge(options.challenge, "authentication", null);
    return NextResponse.json(options);
  }

  if (action === "authentication-verify") {
    if (!validCredentialResponse(body.response) || typeof body.challenge !== "string" || body.challenge.length > 256) {
      return authError(400);
    }
    const response = body.response as AuthenticationResponseJSON;
    const identifier = `passkey:${response.id.slice(0, 256)}`;
    if (await lockedUntil(identifier, ip)) return authError(429);
    const result = await query<CredentialRow>(
      `SELECT credential_id, user_id, public_key, counter, transports, device_type
       FROM webauthn_credentials WHERE credential_id = $1`,
      [response.id],
    );
    const saved = result.rows[0];
    const challenge = await consumeChallenge("authentication", null, body.challenge);
    if (!saved || !challenge) {
      await recordAttempt(identifier, ip, false);
      return authError();
    }
    const userHandle = response.response.userHandle;
    if (userHandle && userHandle !== Buffer.from(saved.user_id.replaceAll("-", ""), "hex").toString("base64url")) {
      await recordAttempt(identifier, ip, false);
      return authError();
    }

    let verified;
    try {
      const { origin, rpID } = relyingParty();
      const credential: WebAuthnCredential = {
        id: saved.credential_id,
        publicKey: Uint8Array.from(saved.public_key),
        counter: Number(saved.counter),
        transports: saved.transports,
      };
      verified = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential,
        requireUserVerification: true,
      });
    } catch (error) {
      console.error("Passkey authentication verification failed", error);
      await recordAttempt(identifier, ip, false);
      return authError();
    }
    if (!verified.verified) {
      await recordAttempt(identifier, ip, false);
      return authError();
    }

    const updated = await withTransaction(async (client) => {
      const credentialUpdate = await client.query<{ user_id: string }>(
        `UPDATE webauthn_credentials
         SET counter = $1, device_type = $2, backed_up = $3, last_used_at = now()
         WHERE credential_id = $4 AND counter = $5
         RETURNING user_id`,
        [
          verified.authenticationInfo.newCounter,
          verified.authenticationInfo.credentialDeviceType,
          verified.authenticationInfo.credentialBackedUp,
          saved.credential_id,
          saved.counter,
        ],
      );
      if (!credentialUpdate.rows[0]) return null;
      const profile = await client.query(
        "SELECT id FROM admin_profiles WHERE id = $1 AND is_active AND deleted_at IS NULL",
        [credentialUpdate.rows[0].user_id],
      );
      return profile.rows[0]?.id as string | undefined;
    });
    if (!updated) {
      await recordAttempt(identifier, ip, false);
      return authError();
    }
    await recordAttempt(identifier, ip, true);
    await openStaffSession(updated, req.headers.get("user-agent"));
    await logActivity(updated, "staff", "sign in", "session", updated, { method: "passkey", ip });
    return NextResponse.json({ ok: true });
  }

  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  if (session.mustChangePassword || session.mustChangeUsername) {
    return NextResponse.json({ error: "Change your sign-in details before continuing." }, { status: 403 });
  }

  if (action === "registration-options") {
    const { rows } = await query<{ credential_id: string; transports: string[] }>(
      "SELECT credential_id, transports FROM webauthn_credentials WHERE user_id = $1",
      [session.userId],
    );
    const profile = await query<{ username: string; display_name: string }>(
      "SELECT username, display_name FROM admin_profiles WHERE id = $1 AND is_active AND deleted_at IS NULL",
      [session.userId],
    );
    if (!profile.rows[0]) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    const { rpID } = relyingParty();
    const options = await generateRegistrationOptions({
      rpName: "Kenya Shipyards Limited",
      rpID,
      userID: Buffer.from(session.userId.replaceAll("-", ""), "hex"),
      userName: profile.rows[0].username,
      userDisplayName: profile.rows[0].display_name || profile.rows[0].username,
      attestationType: "none",
      excludeCredentials: rows.map((credential: { credential_id: string; transports: string[] }) => ({
        id: credential.credential_id,
        transports: credential.transports,
      })),
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "required",
      },
    });
    await saveChallenge(options.challenge, "registration", session.userId);
    return NextResponse.json(options);
  }

  if (action === "registration-verify") {
    if (!validCredentialResponse(body.response) || typeof body.challenge !== "string" || body.challenge.length > 256) {
      return NextResponse.json({ error: "Invalid passkey response." }, { status: 400 });
    }
    const response = body.response as RegistrationResponseJSON;
    const challenge = await consumeChallenge("registration", session.userId, body.challenge);
    if (!challenge) return NextResponse.json({ error: "The passkey request expired. Try again." }, { status: 400 });
    let verified;
    try {
      const { origin, rpID } = relyingParty();
      verified = await verifyRegistrationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: true,
      });
    } catch (error) {
      console.error("Passkey registration verification failed", error);
      return NextResponse.json({ error: "The passkey could not be verified. Try again." }, { status: 400 });
    }
    if (!verified.verified) {
      return NextResponse.json({ error: "The passkey could not be verified. Try again." }, { status: 400 });
    }
    const credential = verified.registrationInfo.credential;
    await query(
      `INSERT INTO webauthn_credentials
        (credential_id, user_id, public_key, counter, transports, device_type, backed_up, friendly_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        credential.id,
        session.userId,
        Buffer.from(credential.publicKey),
        credential.counter,
        credential.transports ?? [],
        verified.registrationInfo.credentialDeviceType,
        verified.registrationInfo.credentialBackedUp,
        "Passkey",
      ],
    );
    await logActivity(session.userId, "staff", "register passkey", "passkey", credential.id);
    return NextResponse.json({ ok: true });
  }

  if (action === "list") {
    const { rows } = await query(
      `SELECT credential_id AS id, friendly_name, created_at, last_used_at
       FROM webauthn_credentials WHERE user_id = $1 ORDER BY created_at`,
      [session.userId],
    );
    return NextResponse.json({ items: rows });
  }

  if (action === "remove") {
    if (typeof body.credentialId !== "string" || body.credentialId.length > 1024) {
      return NextResponse.json({ error: "Invalid passkey." }, { status: 400 });
    }
    const result = await query(
      "DELETE FROM webauthn_credentials WHERE user_id = $1 AND credential_id = $2",
      [session.userId, body.credentialId],
    );
    if (!result.rowCount) return NextResponse.json({ error: "That passkey was not found." }, { status: 404 });
    await logActivity(session.userId, "staff", "remove passkey", "passkey", body.credentialId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "That passkey action is not available." }, { status: 400 });
}
