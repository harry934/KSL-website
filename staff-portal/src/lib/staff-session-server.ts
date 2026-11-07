import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  STAFF_SESSION_COOKIE,
  browserLabel,
  judgeSession,
  sessionCookieOptions,
  sessionNeedsTouch,
  type SessionStop,
} from "@/lib/staff-session";

export async function readStaffSession(userId: string) {
  const admin = createAdminClient();
  const [{ data: profile }, { data: row }] = await Promise.all([
    admin.from("admin_profiles").select("is_active, deleted_at").eq("id", userId).maybeSingle(),
    admin.from("staff_sessions").select("session_key, seen_at").eq("user_id", userId).maybeSingle(),
  ]);
  return {
    active: Boolean(profile?.is_active) && !profile?.deleted_at,
    key: (row?.session_key as string | null) ?? null,
    seenAt: (row?.seen_at as string | null) ?? null,
  };
}

export async function openStaffSession(userId: string, userAgent?: string | null) {
  const key = crypto.randomUUID();
  const seenAt = new Date().toISOString();
  const admin = createAdminClient();
  const { error } = await admin.from("staff_sessions").upsert({
    user_id: userId,
    session_key: key,
    seen_at: seenAt,
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
  await createAdminClient()
    .from("staff_sessions")
    .update({ seen_at: new Date().toISOString() })
    .eq("user_id", userId);
}

/** Clears the account session only when this browser still holds the current key. */
export async function closeMatchingStaffSession(userId: string, cookieKey: string) {
  const row = await readStaffSession(userId);
  if (!row.key || row.key !== cookieKey) return false;
  await createAdminClient().from("staff_sessions").delete().eq("user_id", userId);
  return true;
}

/** Drops a stale or idle session so the staff list no longer shows the person as online. */
export async function clearStaffSession(userId: string) {
  await createAdminClient().from("staff_sessions").delete().eq("user_id", userId);
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
  const reason = judgeSession({
    cookieKey: jar.get(STAFF_SESSION_COOKIE)?.value,
    storedKey: row.key,
    seenAt: row.seenAt,
    now: Date.now(),
  });
  if (reason) return { ok: false, reason };
  if (touch && sessionNeedsTouch(row.seenAt, Date.now())) await touchStaffSession(userId);
  return { ok: true };
}
