import { createClient as createStatelessClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { internalEmailFor } from "@/lib/accounts";

const WINDOW_MINUTES = 15;
const MAX_FAILURES_PER_IDENTIFIER = 5;
const MAX_FAILURES_PER_IP = 20;

export function clientIp(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function isRateLimited(identifier: string, ip: string) {
  const admin = createAdminClient();
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
  const [byIdentifier, byIp] = await Promise.all([
    admin
      .from("login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("identifier", identifier)
      .eq("succeeded", false)
      .gte("created_at", since),
    admin
      .from("login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .eq("succeeded", false)
      .gte("created_at", since),
  ]);
  return (byIdentifier.count ?? 0) >= MAX_FAILURES_PER_IDENTIFIER || (byIp.count ?? 0) >= MAX_FAILURES_PER_IP;
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
