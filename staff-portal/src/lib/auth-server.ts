import { randomInt } from "node:crypto";
import { createClient as createStatelessClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { USERNAME_PATTERN, internalEmailFor } from "@/lib/accounts";

const WINDOW_MINUTES = 15;
const MAX_FAILURES_PER_IDENTIFIER = 5;
const MAX_FAILURES_PER_IP = 20;

export function clientIp(req: NextRequest) {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = req.headers.get("x-forwarded-for");
  if (!forwarded) return "unknown";
  // On Vercel / trusted proxies the client is the first hop.
  const hops = forwarded.split(",").map((hop) => hop.trim()).filter(Boolean);
  return hops[0] ?? "unknown";
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

function usernameStem(value: string) {
  const stem = value.replace(/[^a-z0-9.]/g, "").replace(/^\.+|\.+$/g, "").slice(0, 10);
  return USERNAME_PATTERN.test(stem) ? stem : "";
}

/** Short sign-in names taken from the person's own name, simplest first. "Jane Kamau" gives jane, then jkamau, then jane.kamau. */
export function usernameChoices(displayName: string) {
  const words = displayName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = words[0] ?? "";
  const last = words.length > 1 ? words[words.length - 1] : "";
  const stems = [...new Set([usernameStem(first), last ? usernameStem(first[0] + last) : "", last ? usernameStem(`${first}.${last}`) : ""].filter(Boolean))];
  const choices: string[] = [];
  for (const stem of stems) choices.push(stem);
  for (let n = 2; n <= 30 && choices.length < 40; n += 1) {
    for (const stem of stems) {
      const numbered = usernameStem(`${stem}${n}`);
      if (numbered) choices.push(numbered);
    }
  }
  return choices.length ? choices : ["agent", "agent2", "agent3"];
}

export const ONE_TIME_PASSWORD_MS = 10 * 60 * 1000;

/** When a newly issued password stops working. */
export function oneTimePasswordExpiry(from = Date.now()) {
  return new Date(from + ONE_TIME_PASSWORD_MS).toISOString();
}

/** Readable one-time passcode such as "hT7k-Q4mz-9Rp2": no look-alike characters, always letters and numbers. */
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

/** Six-digit numeric invite passcode for /signup. */
export function generateNumericPasscode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
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
