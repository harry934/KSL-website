import { NextRequest, NextResponse } from "next/server";
import { createDatabaseClient } from "@/lib/db-client";
import { getStaffSession } from "@/lib/session";
import { normalizeUsername, validatePassword, validateUsername } from "@/lib/accounts";
import { hashPassword, verifyPassword } from "@/lib/auth-server";
import { logActivity } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  if (!session.isSuperAdmin && !session.mustChangePassword) {
    return NextResponse.json(
      { error: "Ask an administrator to approve a password change first." },
      { status: 403 }
    );
  }

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

  const admin = createDatabaseClient();
  if (session.mustChangeUsername) {
    const { data: taken } = await admin.from("admin_profiles").select("id").eq("username", newUsername).neq("id", session.userId).maybeSingle();
    if (taken) return NextResponse.json({ error: "This username isn't available. Please try another." }, { status: 409 });
  }

  const { data: profile, error: profileError } = await admin
    .from("admin_profiles")
    .select("password_hash")
    .eq("id", session.userId)
    .maybeSingle();
  if (profileError) return NextResponse.json({ error: "Could not verify your account." }, { status: 503 });
  if (!(await verifyPassword(profile?.password_hash, currentPassword))) {
    const message = "Your current password is not correct.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const profileUpdate: {
    must_change_password: boolean;
    one_time_password_expires_at: null;
    password_hash: string;
    username?: string;
    must_change_username?: boolean;
  } = {
    must_change_password: false,
    one_time_password_expires_at: null,
    password_hash: await hashPassword(newPassword),
  };
  if (session.mustChangeUsername) {
    profileUpdate.username = newUsername;
    profileUpdate.must_change_username = false;
  }
  const { error } = await admin.from("admin_profiles").update(profileUpdate).eq("id", session.userId);
  if (error) return NextResponse.json({ error: "Could not change the sign-in details. Please try again." }, { status: 400 });
  await logActivity(session.userId, "staff", "change password", "admin_profile", session.userId);
  return NextResponse.json({ ok: true });
}
