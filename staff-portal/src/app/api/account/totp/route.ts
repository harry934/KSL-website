import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { getStaffSession } from "@/lib/session";
import { credentialsCurrent, logActivity } from "@/lib/api-auth";
import { createDatabaseClient } from "@/lib/db-client";
import { verifyPassword } from "@/lib/auth-server";
import { query } from "@/lib/db";
import { needsTotpEnrollment } from "@/lib/totp-user";
import {
  base32Encode,
  decryptTotpSecret,
  encryptTotpSecret,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  normalizeRecoveryInput,
  normalizeTotpInput,
  otpauthUri,
  recoveryMatches,
  verifyTotpCode,
} from "@/lib/totp";

type Action = "status" | "begin" | "confirm" | "disable";

export async function POST(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const body = await req.json().catch(() => ({})) as {
    action?: unknown;
    password?: unknown;
    code?: unknown;
    recoveryCode?: unknown;
    mandatory?: unknown;
  };
  const action = body.action as Action;
  if (!["status", "begin", "confirm", "disable"].includes(action)) {
    return NextResponse.json({ error: "That action is not available." }, { status: 400 });
  }

  const mustEnroll = await needsTotpEnrollment(session.userId);
  const blocked = credentialsCurrent(session, { allowTotpSetup: mustEnroll && (action === "begin" || action === "confirm") });
  if (blocked) return blocked;

  const admin = createDatabaseClient();

  if (action === "status") {
    const { data: enabled } = await admin.from("staff_totp").select("enabled_at").eq("user_id", session.userId).maybeSingle();
    const recovery = await query<{ n: string }>(
      `SELECT count(*)::text AS n FROM staff_totp_recovery WHERE user_id = $1::uuid AND used_at IS NULL`,
      [session.userId],
    );
    const pendingSetup = await query<{ user_id: string }>(
      `SELECT user_id FROM staff_totp_setup WHERE user_id = $1::uuid AND expires_at > now()`,
      [session.userId],
    );
    return NextResponse.json({
      enabled: Boolean(enabled),
      enabledAt: enabled?.enabled_at ?? null,
      recoveryRemaining: Number(recovery.rows[0]?.n ?? 0),
      setupInProgress: pendingSetup.rows.length > 0,
    });
  }

  const password = typeof body.password === "string" ? body.password : "";
  const mandatoryBegin = action === "begin" && body.mandatory === true && mustEnroll;
  if ((action === "begin" || action === "disable") && !password && !mandatoryBegin) {
    return NextResponse.json({ error: "Enter your current password." }, { status: 400 });
  }
  if (password) {
    const { data: profile } = await admin
      .from("admin_profiles")
      .select("password_hash")
      .eq("id", session.userId)
      .maybeSingle();
    if (!(await verifyPassword(profile?.password_hash, password))) {
      return NextResponse.json({ error: "The password was not accepted." }, { status: 401 });
    }
  }

  if (action === "begin") {
    const { data: existing } = await admin.from("staff_totp").select("user_id").eq("user_id", session.userId).maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "An authenticator app is already set up on this account." }, { status: 400 });
    }
    let secretEnc: Buffer;
    let secret: Buffer;
    try {
      secret = generateTotpSecret();
      secretEnc = encryptTotpSecret(secret);
    } catch (err) {
      console.error("TOTP setup unavailable", err);
      return NextResponse.json(
        { error: "Authenticator setup is not configured on the server yet. Ask an administrator to set TOTP_ENCRYPTION_SECRET." },
        { status: 503 },
      );
    }
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await query(
      `INSERT INTO staff_totp_setup (user_id, secret_enc, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET secret_enc = EXCLUDED.secret_enc, expires_at = EXCLUDED.expires_at`,
      [session.userId, secretEnc, expires],
    );
    const secretBase32 = base32Encode(secret);
    const uri = otpauthUri(session.username || session.userId, secretBase32);
    const qrDataUrl = await QRCode.toDataURL(uri, { margin: 1, width: 220 });
    return NextResponse.json({ qrDataUrl, secretBase32, manualKey: secretBase32 });
  }

  if (action === "confirm") {
    const code = typeof body.code === "string" ? normalizeTotpInput(body.code) : "";
    if (code.length !== 6) {
      return NextResponse.json({ error: "Enter the 6-digit code from your authenticator app." }, { status: 400 });
    }
    const setup = await query<{ secret_enc: Buffer }>(
      `SELECT secret_enc FROM staff_totp_setup WHERE user_id = $1::uuid AND expires_at > now()`,
      [session.userId],
    );
    if (!setup.rows[0]) {
      return NextResponse.json({ error: "Setup expired. Start again." }, { status: 400 });
    }
    const secret = decryptTotpSecret(setup.rows[0].secret_enc);
    if (!verifyTotpCode(secret, code)) {
      return NextResponse.json({ error: "The code was not accepted. Check the time on your phone and try again." }, { status: 400 });
    }
    const secretEnc = encryptTotpSecret(secret);
    await query(`DELETE FROM staff_totp_setup WHERE user_id = $1::uuid`, [session.userId]);
    await query(
      `INSERT INTO staff_totp (user_id, secret_enc) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET secret_enc = EXCLUDED.secret_enc, enabled_at = now(), updated_at = now()`,
      [session.userId, secretEnc],
    );
    await query(`DELETE FROM staff_totp_recovery WHERE user_id = $1::uuid`, [session.userId]);
    const recoveryCodes = generateRecoveryCodes(10);
    for (const raw of recoveryCodes) {
      await query(`INSERT INTO staff_totp_recovery (user_id, code_hash) VALUES ($1, $2)`, [
        session.userId,
        hashRecoveryCode(raw),
      ]);
    }
    await query(`UPDATE admin_profiles SET must_setup_totp = false WHERE id = $1::uuid`, [session.userId]);
    await logActivity(session.userId, "staff", "enable authenticator", "totp", session.userId);
    return NextResponse.json({ ok: true, recoveryCodes });
  }

  if (action === "disable") {
    const code = typeof body.code === "string" ? normalizeTotpInput(body.code) : "";
    const recovery = typeof body.recoveryCode === "string" ? normalizeRecoveryInput(body.recoveryCode) : "";
    const { data: row } = await admin.from("staff_totp").select("secret_enc").eq("user_id", session.userId).maybeSingle();
    if (!row) {
      return NextResponse.json({ error: "No authenticator app is set up on this account." }, { status: 400 });
    }
    let allowed = false;
    if (recovery) {
      const { rows } = await query<{ id: string; code_hash: string }>(
        `SELECT id, code_hash FROM staff_totp_recovery WHERE user_id = $1::uuid AND used_at IS NULL`,
        [session.userId],
      );
      const match = rows.find((item) => recoveryMatches(item.code_hash, recovery));
      if (match) {
        await query(`UPDATE staff_totp_recovery SET used_at = now() WHERE id = $1::uuid`, [match.id]);
        allowed = true;
      }
    } else if (code.length === 6) {
      const secret = decryptTotpSecret(Buffer.from(row.secret_enc as Buffer));
      allowed = verifyTotpCode(secret, code);
    }
    if (!allowed) {
      return NextResponse.json({ error: "Enter your current authenticator code or a recovery code." }, { status: 401 });
    }
    await query(`DELETE FROM staff_totp WHERE user_id = $1::uuid`, [session.userId]);
    await query(`DELETE FROM staff_totp_recovery WHERE user_id = $1::uuid`, [session.userId]);
    await query(`DELETE FROM staff_totp_setup WHERE user_id = $1::uuid`, [session.userId]);
    await logActivity(session.userId, "staff", "disable authenticator", "totp", session.userId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "That action is not available." }, { status: 400 });
}