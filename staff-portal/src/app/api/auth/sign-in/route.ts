import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, isRateLimited, recordAttempt } from "@/lib/auth-server";
import { logActivity } from "@/lib/api-auth";

const GENERIC_ERROR = "Incorrect username, email or password.";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const identifier = String(body.identifier ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const ip = clientIp(req);

  if (!identifier || !password || identifier.length > 254 || password.length > 200) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  if (await isRateLimited(identifier, ip)) {
    return NextResponse.json(
      { error: "Too many failed attempts. Wait 15 minutes and try again." },
      { status: 429 }
    );
  }

  const admin = createAdminClient();
  let email: string | null = identifier;
  if (!identifier.includes("@")) {
    const { data } = await admin.rpc("auth_email_for_username", { p_username: identifier });
    email = (data as string | null) ?? null;
  }

  if (!email) {
    await recordAttempt(identifier, ip, false);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: signIn, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !signIn.user) {
    await recordAttempt(identifier, ip, false);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const { data: profile } = await admin
    .from("admin_profiles")
    .select("is_active")
    .eq("id", signIn.user.id)
    .maybeSingle();

  if (!profile?.is_active) {
    await supabase.auth.signOut();
    await recordAttempt(identifier, ip, false);
    return NextResponse.json({ error: "This account is not active. Contact the super admin." }, { status: 403 });
  }

  await recordAttempt(identifier, ip, true);
  await logActivity(signIn.user.id, "staff", "sign in", "session", signIn.user.id, { ip });
  return NextResponse.json({ ok: true });
}
