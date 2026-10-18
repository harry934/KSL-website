import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, formatClock, lockedUntil, recordAttempt } from "@/lib/auth-server";
import { normalizeUsername } from "@/lib/accounts";
import { logActivity } from "@/lib/api-auth";

const INVALID = "Invalid username or password.";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const username = normalizeUsername(body.username);
  const password = String(body.password ?? "");
  const ip = clientIp(req);

  if (!username || !password || username.length > 64 || password.length > 200) {
    return NextResponse.json({ error: INVALID }, { status: 400 });
  }

  const blockedUntil = await lockedUntil(username, ip);
  if (blockedUntil) {
    return NextResponse.json(
      { error: `Too many failed attempts. Try again after ${formatClock(blockedUntil)}.` },
      { status: 429 }
    );
  }

  const admin = createAdminClient();
  const { data: email } = await admin.rpc("auth_email_for_username", { p_username: username });
  if (!email) {
    await recordAttempt(username, ip, false);
    return NextResponse.json({ error: INVALID }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: signIn, error } = await supabase.auth.signInWithPassword({ email: email as string, password });
  if (error || !signIn.user) {
    await recordAttempt(username, ip, false);
    return NextResponse.json({ error: INVALID }, { status: 401 });
  }

  const { data: profile } = await admin
    .from("admin_profiles")
    .select("is_active")
    .eq("id", signIn.user.id)
    .maybeSingle();

  if (!profile?.is_active) {
    await supabase.auth.signOut();
    await recordAttempt(username, ip, false);
    return NextResponse.json({ error: "Your account is suspended. Contact an administrator." }, { status: 403 });
  }

  await recordAttempt(username, ip, true);
  // A new sign-in replaces any other open session for this account.
  const { error: othersError } = await supabase.auth.signOut({ scope: "others" });
  if (othersError) {
    console.error("Could not close the other session", othersError.message);
  }
  await logActivity(signIn.user.id, "staff", "sign in", "session", signIn.user.id, { ip });
  return NextResponse.json({ ok: true });
}
