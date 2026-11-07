import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, formatClock, generateOneTimePassword, lockedUntil, recordAttempt } from "@/lib/auth-server";
import { normalizeUsername } from "@/lib/accounts";
import { logActivity } from "@/lib/api-auth";
import { openStaffSession } from "@/lib/staff-session-server";

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
  const { data: gate } = await admin
    .from("admin_profiles")
    .select("id, is_active, deleted_at, must_change_password, one_time_password_expires_at")
    .eq("username", username)
    .maybeSingle();
  if (gate?.deleted_at) {
    await recordAttempt(username, ip, false);
    return NextResponse.json({ error: INVALID }, { status: 401 });
  }
  const expiresAt = gate?.one_time_password_expires_at ? new Date(gate.one_time_password_expires_at).getTime() : 0;
  if (gate?.is_active && gate.must_change_password && expiresAt && expiresAt <= Date.now()) {
    const discarded = `${generateOneTimePassword()}${generateOneTimePassword()}`.replace(/-/g, "");
    await admin.auth.admin.updateUserById(gate.id, { password: discarded });
    await recordAttempt(username, ip, false);
    return NextResponse.json(
      { error: "This one-time passcode has expired. Ask an administrator for a new one." },
      { status: 401 }
    );
  }

  const { data: email } = await admin.rpc("auth_email_for_username", { p_username: username });
  if (!email) {
    await recordAttempt(username, ip, false);
    return NextResponse.json({ error: INVALID }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: signIn, error } = await supabase.auth.signInWithPassword({ email: email as string, password });
  if (error?.code === "email_provider_disabled") {
    return NextResponse.json(
      { error: "Email sign-in is turned off. In Supabase, enable the Email provider and leave new sign-ups off." },
      { status: 503 }
    );
  }
  if (error || !signIn.user) {
    await recordAttempt(username, ip, false);
    return NextResponse.json({ error: INVALID }, { status: 401 });
  }

  const { data: profile } = await admin
    .from("admin_profiles")
    .select("is_active, deleted_at")
    .eq("id", signIn.user.id)
    .maybeSingle();

  if (profile?.deleted_at) {
    await supabase.auth.signOut();
    await recordAttempt(username, ip, false);
    return NextResponse.json({ error: INVALID }, { status: 401 });
  }

  if (!profile?.is_active) {
    await supabase.auth.signOut();
    await recordAttempt(username, ip, false);
    return NextResponse.json({ error: INVALID }, { status: 401 });
  }

  await recordAttempt(username, ip, true);
  const { error: othersError } = await supabase.auth.signOut({ scope: "others" });
  if (othersError) {
    console.error("Could not close the other session", othersError.message);
  }
  try {
    await openStaffSession(signIn.user.id, req.headers.get("user-agent"));
  } catch {
    await supabase.auth.signOut();
    return NextResponse.json({ error: "Could not start a session. Try again." }, { status: 500 });
  }
  await logActivity(signIn.user.id, "staff", "sign in", "session", signIn.user.id, { ip });
  return NextResponse.json({ ok: true });
}
