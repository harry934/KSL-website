import { NextRequest, NextResponse } from "next/server";
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type AuthenticationResponseJSON,
  type WebAuthnCredential,
} from "@simplewebauthn/server";
import { normalizeUsername } from "@/lib/accounts";
import { clientIp, formatClock, lockedUntil, recordAttempt } from "@/lib/auth-server";
import { finishPrimaryAuth } from "@/lib/auth-mfa";
import { createDatabaseClient } from "@/lib/db-client";
import { query, withTransaction } from "@/lib/db";
import { beginRecoveryAfterVerification, userHasTotp } from "@/lib/totp-user";
import { openStaffSession } from "@/lib/staff-session-server";
import { logActivity } from "@/lib/api-auth";
import {
  decryptTotpSecret,
  normalizeRecoveryInput,
  normalizeTotpInput,
  recoveryMatches,
  verifyTotpCode,
} from "@/lib/totp";

const GENERIC = "Could not recover access with those details.";

function relyingParty() {
  const portal = process.env.NEXT_PUBLIC_PORTAL_URL?.trim();
  if (!portal) throw new Error("NEXT_PUBLIC_PORTAL_URL is required for passkeys");
  const url = new URL(portal);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("Passkeys require an HTTPS portal URL in production");
  }
  return { origin: url.origin, rpID: url.hostname };
}

async function saveChallenge(challenge: string, userId: string) {
  await query("DELETE FROM webauthn_challenges WHERE expires_at <= now()");
  await query(
    `INSERT INTO webauthn_challenges (challenge, purpose, user_id, expires_at)
     VALUES ($1, 'authentication', $2, now() + interval '5 minutes')`,
    [challenge, userId],
  );
}

async function consumeChallenge(userId: string, challenge: string) {
  const result = await query<{ challenge: string }>(
    `DELETE FROM webauthn_challenges
     WHERE purpose = 'authentication' AND user_id = $1::uuid
       AND challenge = $2 AND expires_at > now()
     RETURNING challenge`,
    [userId, challenge],
  );
  return result.rows[0]?.challenge ?? null;
}

function validAuthResponse(value: unknown): value is AuthenticationResponseJSON {
  if (!value || typeof value !== "object") return false;
  const response = value as Record<string, unknown>;
  return (
    typeof response.id === "string" &&
    response.id.length > 0 &&
    response.id.length <= 1024 &&
    typeof response.rawId === "string" &&
    response.response !== null &&
    typeof response.response === "object"
  );
}

async function activeUserIdForUsername(username: string) {
  const admin = createDatabaseClient();
  const { data } = await admin
    .from("admin_profiles")
    .select("id, is_active, deleted_at")
    .eq("username", username)
    .maybeSingle();
  if (!data?.is_active || data.deleted_at) return null;
  return data.id as string;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    action?: unknown;
    username?: unknown;
    code?: unknown;
    recoveryCode?: unknown;
    challenge?: unknown;
    response?: unknown;
  };
  const action = body.action;
  const username = normalizeUsername(body.username);
  const ip = clientIp(req);

  if (action === "totp-verify") {
    if (!username || username.length > 64) {
      return NextResponse.json({ error: "Enter the username you sign in with." }, { status: 400 });
    }
    const identifier = `recover:${username}`;
    const blockedUntil = await lockedUntil(identifier, ip);
    if (blockedUntil) {
      return NextResponse.json(
        { error: `Too many failed attempts. Try again after ${formatClock(blockedUntil)}.` },
        { status: 429 },
      );
    }
    const userId = await activeUserIdForUsername(username);
    if (!userId || !(await userHasTotp(userId))) {
      await recordAttempt(identifier, ip, false);
      return NextResponse.json(
        { error: "Authenticator recovery is not available for this username." },
        { status: 401 },
      );
    }

    const code = typeof body.code === "string" ? normalizeTotpInput(body.code) : "";
    const recovery = typeof body.recoveryCode === "string" ? normalizeRecoveryInput(body.recoveryCode) : "";
    let verified = false;

    if (recovery) {
      const { rows } = await query<{ id: string; code_hash: string }>(
        `SELECT id, code_hash FROM staff_totp_recovery WHERE user_id = $1::uuid AND used_at IS NULL`,
        [userId],
      );
      const match = rows.find((row) => recoveryMatches(row.code_hash, recovery));
      if (match) {
        await query(`UPDATE staff_totp_recovery SET used_at = now() WHERE id = $1::uuid`, [match.id]);
        verified = true;
      }
    } else if (code.length === 6) {
      const { data: row } = await createDatabaseClient()
        .from("staff_totp")
        .select("secret_enc")
        .eq("user_id", userId)
        .maybeSingle();
      if (row?.secret_enc) {
        const secret = decryptTotpSecret(Buffer.from(row.secret_enc as Buffer));
        verified = verifyTotpCode(secret, code);
      }
    }

    if (!verified) {
      await recordAttempt(identifier, ip, false);
      return NextResponse.json({ error: "The code was not accepted." }, { status: 401 });
    }

    await recordAttempt(identifier, ip, true);
    await beginRecoveryAfterVerification(userId);
    try {
      await openStaffSession(userId, req.headers.get("user-agent"));
    } catch (error) {
      console.error("Could not start staff session after recovery", error);
      return NextResponse.json({ error: "Could not start a session. Try again." }, { status: 500 });
    }
    await logActivity(userId, "staff", "recover access", "session", userId, { ip, method: "totp" });
    return NextResponse.json({ ok: true, passwordResetRequired: true });
  }

  if (action === "passkey-options") {
    if (!username || username.length > 64) {
      return NextResponse.json({ error: "Enter the username you sign in with." }, { status: 400 });
    }
    const userId = await activeUserIdForUsername(username);
    if (!userId) {
      return NextResponse.json({ error: GENERIC }, { status: 401 });
    }
    const creds = await query<{ credential_id: string; transports: string[] }>(
      `SELECT credential_id, transports FROM webauthn_credentials WHERE user_id = $1::uuid`,
      [userId],
    );
    if (!creds.rows.length) {
      return NextResponse.json({ error: "No passkey is registered for this username." }, { status: 401 });
    }
    const { rpID } = relyingParty();
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "required",
      allowCredentials: creds.rows.map((row) => ({
        id: row.credential_id,
        transports: row.transports,
      })),
    });
    await saveChallenge(options.challenge, userId);
    return NextResponse.json({ ...options, username });
  }

  if (action === "passkey-verify") {
    if (
      !validAuthResponse(body.response) ||
      typeof body.challenge !== "string" ||
      body.challenge.length > 256 ||
      !username ||
      username.length > 64
    ) {
      return NextResponse.json({ error: "The passkey was not accepted." }, { status: 400 });
    }
    const userId = await activeUserIdForUsername(username);
    if (!userId) return NextResponse.json({ error: GENERIC }, { status: 401 });

    const response = body.response;
    const identifier = `recover-passkey:${response.id.slice(0, 256)}`;
    if (await lockedUntil(identifier, ip)) {
      return NextResponse.json({ error: "Too many failed attempts. Try again later." }, { status: 429 });
    }

    const challenge = await consumeChallenge(userId, body.challenge);
    if (!challenge) {
      await recordAttempt(identifier, ip, false);
      return NextResponse.json({ error: "The passkey was not accepted." }, { status: 401 });
    }

    const result = await query<CredentialRow>(
      `SELECT credential_id, user_id, public_key, counter, transports, device_type
       FROM webauthn_credentials WHERE credential_id = $1 AND user_id = $2::uuid`,
      [response.id, userId],
    );
    const saved = result.rows[0];
    if (!saved) {
      await recordAttempt(identifier, ip, false);
      return NextResponse.json({ error: "The passkey was not accepted." }, { status: 401 });
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
      console.error("Recovery passkey verification failed", error);
      await recordAttempt(identifier, ip, false);
      return NextResponse.json({ error: "The passkey was not accepted." }, { status: 401 });
    }
    if (!verified.verified) {
      await recordAttempt(identifier, ip, false);
      return NextResponse.json({ error: "The passkey was not accepted." }, { status: 401 });
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
      return credentialUpdate.rows[0]?.user_id ?? null;
    });
    if (!updated) {
      await recordAttempt(identifier, ip, false);
      return NextResponse.json({ error: "The passkey was not accepted." }, { status: 401 });
    }

    await recordAttempt(identifier, ip, true);
    return finishPrimaryAuth(req, userId, "recovery", { ip, method: "passkey" });
  }

  return NextResponse.json({ error: "That action is not available." }, { status: 400 });
}

type CredentialRow = {
  credential_id: string;
  user_id: string;
  public_key: Buffer;
  counter: string;
  transports: string[];
  device_type: "singleDevice" | "multiDevice";
};