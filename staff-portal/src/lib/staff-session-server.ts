import { cookies } from "next/headers";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { query } from "@/lib/db";
import { createDatabaseClient } from "@/lib/db-client";
import {
  STAFF_SESSION_COOKIE,
  browserLabel,
  judgeSession,
  sessionCookieOptions,
  sessionNeedsTouch,
  type SessionStop,
} from "@/lib/staff-session";

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function sessionUserIdForToken(token: string) {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return null;
  const result = await query<{ user_id: string }>(
    "SELECT user_id FROM staff_sessions WHERE session_key = $1 AND expires_at > now()",
    [hashSessionToken(token)],
  );
  return result.rows[0]?.user_id ?? null;
}

export async function readStaffSession(userId: string) {
  const admin = createDatabaseClient();
  const [profileResult, sessionResult] = await Promise.all([
    admin.from("admin_profiles").select("is_active, deleted_at").eq("id", userId).maybeSingle(),
    admin.from("staff_sessions").select("session_key, seen_at, expires_at").eq("user_id", userId).maybeSingle(),
  ]);
  if (profileResult.error || sessionResult.error) throw new Error("Could not validate the staff session");
  const profile = profileResult.data;
  const row = sessionResult.data;
  return {
    active: Boolean(profile?.is_active) && !profile?.deleted_at,
    key: (row?.session_key as string | null) ?? null,
    seenAt: (row?.seen_at as string | null) ?? null,
    expiresAt: (row?.expires_at as string | null) ?? null,
  };
}

export async function openStaffSession(userId: string, userAgent?: string | null) {
  const key = randomBytes(32).toString("base64url");
  const seenAt = new Date().toISOString();
  const admin = createDatabaseClient();
  const { error } = await admin.from("staff_sessions").upsert({
    user_id: userId,
    session_key: hashSessionToken(key),
    seen_at: seenAt,
    expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  });
  if (error) throw new Error(error.message);
  const label = browserLabel(userAgent);
  if (label) {
    await admin.from("staff_sessions").update({ client_label: label }).eq("user_id", userId);
  }
  const jar = await cookies();
  jar.set(STAFF_SESSION_COOKIE, key, sessionCookieOptions());
  return key;
}

export async function touchStaffSession(userId: string) {
  const { error } = await createDatabaseClient()
    .from("staff_sessions")
    .update({ seen_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) throw new Error("Could not update the staff session");
}

/** Clears the account session only when this browser still holds the current key. */
export async function closeMatchingStaffSession(userId: string, cookieKey: string) {
  const row = await readStaffSession(userId);
  const expected = row.key ? Buffer.from(row.key, "hex") : Buffer.alloc(0);
  const provided = Buffer.from(hashSessionToken(cookieKey), "hex");
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return false;
  await createDatabaseClient().from("staff_sessions").delete().eq("user_id", userId);
  return true;
}

/** Drops a stale or idle session so the staff list no longer shows the person as online. */
export async function clearStaffSession(userId: string) {
  await createDatabaseClient().from("staff_sessions").delete().eq("user_id", userId);
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(STAFF_SESSION_COOKIE, "", sessionCookieOptions(0));
}

export async function liveStaffSession(userId: string, touch: boolean): Promise<
  | { ok: true }
  | { ok: false; reason: SessionStop | "suspended" }
> {
  const row = await readStaffSession(userId);
  if (!row.active) return { ok: false, reason: "suspended" };
  const jar = await cookies();
  const cookieKey = jar.get(STAFF_SESSION_COOKIE)?.value ?? "";
  const reason = judgeSession({
    cookieKey: cookieKey ? hashSessionToken(cookieKey) : null,
    storedKey: row.key,
    seenAt: row.seenAt,
    now: Date.now(),
  });
  if (reason || (row.expiresAt && Date.parse(row.expiresAt) <= Date.now())) {
    return { ok: false, reason: reason ?? "missing" };
  }
  if (touch && sessionNeedsTouch(row.seenAt, Date.now())) await touchStaffSession(userId);
  return { ok: true };
}
