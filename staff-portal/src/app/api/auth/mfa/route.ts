import { NextRequest, NextResponse } from "next/server";
import { clientIp, formatClock, lockedUntil, recordAttempt, verifyPassword } from "@/lib/auth-server";
import { createDatabaseClient } from "@/lib/db-client";
import { logActivity } from "@/lib/api-auth";
import { clearMfaPending, resolveMfaPendingUserId } from "@/lib/mfa-pending";
import { openStaffSession } from "@/lib/staff-session-server";
import {
  decryptTotpSecret,
  normalizeRecoveryInput,
  normalizeTotpInput,
  recoveryMatches,
  verifyTotpCode,
} from "@/lib/totp";
import { query } from "@/lib/db";

const FAIL = "The code was not accepted.";

export async function POST(req: NextRequest) {
  const userId = await resolveMfaPendingUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "This sign-in step expired. Start again with your username and password." }, { status: 401 });
  }
  const ip = clientIp(req);
  const identifier = `mfa:${userId}`;
  const blockedUntil = await lockedUntil(identifier, ip);
  if (blockedUntil) {
    return NextResponse.json(
      { error: `Too many failed attempts. Try again after ${formatClock(blockedUntil)}.` },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => ({})) as { code?: unknown; recoveryCode?: unknown };
  const code = typeof body.code === "string" ? normalizeTotpInput(body.code) : "";
  const recovery = typeof body.recoveryCode === "string" ? normalizeRecoveryInput(body.recoveryCode) : "";

  const admin = createDatabaseClient();
  const { data: profile } = await admin
    .from("admin_profiles")
    .select("id, username, is_active, deleted_at")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.is_active || profile.deleted_at) {
    await clearMfaPending(req);
    return NextResponse.json({ error: FAIL }, { status: 401 });
  }

  let verified = false;
  let usedRecovery = false;

  if (recovery) {
    const { rows } = await query<{ id: string; code_hash: string }>(
      `SELECT id, code_hash FROM staff_totp_recovery WHERE user_id = $1::uuid AND used_at IS NULL`,
      [userId],
    );
    const match = rows.find((row) => recoveryMatches(row.code_hash, recovery));
    if (match) {
      await query(`UPDATE staff_totp_recovery SET used_at = now() WHERE id = $1::uuid`, [match.id]);
      verified = true;
      usedRecovery = true;
    }
  } else if (code.length === 6) {
    const { data: row } = await admin.from("staff_totp").select("secret_enc").eq("user_id", userId).maybeSingle();
    if (row?.secret_enc) {
      const secret = decryptTotpSecret(Buffer.from(row.secret_enc as Buffer));
      verified = verifyTotpCode(secret, code);
    }
  }

  if (!verified) {
    await recordAttempt(identifier, ip, false);
    return NextResponse.json({ error: FAIL }, { status: 401 });
  }

  await recordAttempt(identifier, ip, true);
  await clearMfaPending(req);
  try {
    await openStaffSession(userId, req.headers.get("user-agent"));
  } catch (error) {
    console.error("Could not start staff session after MFA", error);
    return NextResponse.json({ error: "Could not start a session. Try again." }, { status: 500 });
  }
  await logActivity(userId, "staff", "sign in", "session", userId, {
    ip,
    method: usedRecovery ? "totp-recovery" : "totp",
  });
  return NextResponse.json({ ok: true });
}