import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStaffSession } from "@/lib/session";
import { normalizeUsername, validatePassword, validateUsername } from "@/lib/accounts";
import { authEmailFor, verifyPassword } from "@/lib/auth-server";
import { logActivity } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const currentPassword = String(body.currentPassword ?? "");
  const newPassword = String(body.newPassword ?? "");
  const newUsername = session.mustChangeUsername ? normalizeUsername(body.newUsername) : "";

  const policyError = validatePassword(newPassword);
  if (policyError) return NextResponse.json({ error: policyError }, { status: 400 });
  if (newPassword === currentPassword) {
    return NextResponse.json({ error: "Choose a password different from the current one." }, { status: 400 });
  }
  if (session.mustChangeUsername) {
    const usernameError = validateUsername(newUsername);
    if (usernameError) return NextResponse.json({ error: usernameError }, { status: 400 });
    if (newUsername === session.username) {
      return NextResponse.json({ error: "Choose a username different from the one that was created for you." }, { status: 400 });
    }
  }

  const admin = createAdminClient();
  if (session.mustChangeUsername) {
    const { data: taken } = await admin.from("admin_profiles").select("id").eq("username", newUsername).neq("id", session.userId).maybeSingle();
    if (taken) return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
  }

  const { data: authUser } = await admin.auth.admin.getUserById(session.userId);
  const authEmail = authUser.user?.email;
  if (!authEmail || !(await verifyPassword(authEmail, currentPassword))) {
    const message = session.mustChangePassword ? "The one-time password is not correct." : "Your current password is not correct.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const nextEmail = session.mustChangeUsername ? authEmailFor(newUsername, session.email || null) : authEmail;
  const { error } = await admin.auth.admin.updateUserById(session.userId, {
    password: newPassword,
    ...(session.mustChangeUsername ? { email: nextEmail } : {}),
  });
  if (error) return NextResponse.json({ error: "Could not change the sign-in details. Please try again." }, { status: 400 });

  const profileUpdate: { must_change_password: boolean; username?: string; must_change_username?: boolean } = {
    must_change_password: false,
  };
  if (session.mustChangeUsername) {
    profileUpdate.username = newUsername;
    profileUpdate.must_change_username = false;
  }
  await admin.from("admin_profiles").update(profileUpdate).eq("id", session.userId);
  await logActivity(session.userId, "staff", "change password", "admin_profile", session.userId);

  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email: nextEmail, password: newPassword });
  return NextResponse.json({ ok: true });
}
