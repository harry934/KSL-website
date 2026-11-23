import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { sessionCookieOptions } from "@/lib/staff-session";

export const MFA_PENDING_COOKIE = "ksl_mfa_pending";
const PENDING_TTL_SEC = 5 * 60;

export type MfaPendingPurpose = "login" | "recovery";

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function purgeExpiredMfaPending() {
  await query("DELETE FROM mfa_pending_logins WHERE expires_at <= now()");
  await query("DELETE FROM staff_totp_setup WHERE expires_at <= now()");
}

export async function startMfaPending(userId: string, purpose: MfaPendingPurpose = "login"): Promise<string> {
  await purgeExpiredMfaPending();
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + PENDING_TTL_SEC * 1000).toISOString();
  await query(
    `INSERT INTO mfa_pending_logins (token_hash, user_id, expires_at, purpose) VALUES ($1, $2, $3, $4)`,
    [tokenHash(token), userId, expires, purpose],
  );
  const jar = await cookies();
  jar.set(MFA_PENDING_COOKIE, token, sessionCookieOptions(PENDING_TTL_SEC));
  return token;
}

export async function resolveMfaPending(req: NextRequest): Promise<{ userId: string; purpose: MfaPendingPurpose } | null> {
  const token = req.cookies.get(MFA_PENDING_COOKIE)?.value ?? "";
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return null;
  await purgeExpiredMfaPending();
  const result = await query<{ user_id: string; purpose: MfaPendingPurpose }>(
    `SELECT user_id, purpose FROM mfa_pending_logins WHERE token_hash = $1 AND expires_at > now()`,
    [tokenHash(token)],
  );
  const row = result.rows[0];
  if (!row) return null;
  const purpose = row.purpose === "recovery" ? "recovery" : "login";
  return { userId: row.user_id, purpose };
}

export async function resolveMfaPendingUserId(req: NextRequest): Promise<string | null> {
  return (await resolveMfaPending(req))?.userId ?? null;
}

export async function clearMfaPending(req: NextRequest) {
  const token = req.cookies.get(MFA_PENDING_COOKIE)?.value ?? "";
  if (token) {
    await query("DELETE FROM mfa_pending_logins WHERE token_hash = $1", [tokenHash(token)]);
  }
  const jar = await cookies();
  jar.set(MFA_PENDING_COOKIE, "", { ...sessionCookieOptions(0), maxAge: 0 });
}