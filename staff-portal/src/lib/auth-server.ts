import { randomInt } from "node:crypto";
import { createClient as createStatelessClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { USERNAME_PATTERN, internalEmailFor } from "@/lib/accounts";

const WINDOW_MINUTES = 15;
const MAX_FAILURES_PER_IDENTIFIER = 5;
const MAX_FAILURES_PER_IP = 20;

export function clientIp(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/** When sign-in is blocked, the time it opens again; null when not blocked. */
export async function lockedUntil(identifier: string, ip: string): Promise<Date | null> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
  const recentFailures = (column: "identifier" | "ip", value: string, limit: number) =>
    admin
      .from("login_attempts")
      .select("created_at")
      .eq(column, value)
      .eq("succeeded", false)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(limit);

  const [byIdentifier, byIp] = await Promise.all([
    recentFailures("identifier", identifier, MAX_FAILURES_PER_IDENTIFIER),
    recentFailures("ip", ip, MAX_FAILURES_PER_IP),
  ]);

  const until = (rows: { created_at: string }[] | null, max: number) =>
    rows && rows.length >= max ? new Date(rows[max - 1].created_at).getTime() + WINDOW_MINUTES * 60_000 : 0;
  const latest = Math.max(
    until(byIdentifier.data, MAX_FAILURES_PER_IDENTIFIER),
    until(byIp.data, MAX_FAILURES_PER_IP)
  );
  return latest > Date.now() ? new Date(latest) : null;
}

export function formatClock(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Africa/Nairobi",
  }).format(date);
}

const OTP_LETTERS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
const OTP_DIGITS = "23456789";

/** Readable one-time password such as "hT7k-Q4mz-9Rp2": no look-alike characters, always letters and numbers. */
const USERNAME_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** A sign-in name from the person's name, plus a short random ending so it is unique. */
export function suggestUsername(displayName: string) {
  const words = displayName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  let stem = words.slice(0, 2).join(".").replace(/[^a-z0-9.]/g, "").replace(/^\.+|\.+$/g, "").slice(0, 20);
  if (stem.length < 3 || !/^[a-z0-9]/.test(stem)) stem = "agent";
  const suffix = Array.from({ length: 4 }, () => USERNAME_ALPHABET[randomInt(USERNAME_ALPHABET.length)]).join("");
  const candidate = `${stem}.${suffix}`.slice(0, 32);
  return USERNAME_PATTERN.test(candidate) ? candidate : `agent.${suffix}`;
}

export function generateOneTimePassword() {
  const all = OTP_LETTERS + OTP_DIGITS;
  for (;;) {
    const chars = Array.from({ length: 12 }, () => all[randomInt(all.length)]);
    const value = chars.join("");
    if (/[a-zA-Z]/.test(value) && /[0-9]/.test(value)) {
      return `${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8)}`;
    }
  }
}

export async function recordAttempt(identifier: string, ip: string, succeeded: boolean) {
  const admin = createAdminClient();
  await admin.from("login_attempts").insert({ identifier, ip, succeeded });
  if (succeeded) {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60_000).toISOString();
    await admin.from("login_attempts").delete().lt("created_at", cutoff);
  }
}

/** Auth email used to sign in: the contact email when set, otherwise the hidden internal address. */
export function authEmailFor(username: string, contactEmail: string | null) {
  return contactEmail ? contactEmail.toLowerCase() : internalEmailFor(username);
}

export async function verifyPassword(email: string, password: string) {
  const client = createStatelessClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { error } = await client.auth.signInWithPassword({ email, password });
  return !error;
}
