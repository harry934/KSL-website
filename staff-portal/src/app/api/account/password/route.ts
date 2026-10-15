import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffSession } from "@/lib/session";
import { validatePassword } from "@/lib/accounts";
import { verifyPassword } from "@/lib/auth-server";
import { logActivity } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const currentPassword = String(body.currentPassword ?? "");
  const newPassword = String(body.newPassword ?? "");

  const policyError = validatePassword(newPassword);
  if (policyError) return NextResponse.json({ error: policyError }, { status: 400 });
  if (newPassword === currentPassword) {
    return NextResponse.json({ error: "Choose a password different from the current one." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: authUser } = await admin.auth.admin.getUserById(session.userId);
  const authEmail = authUser.user?.email;
  if (!authEmail || !(await verifyPassword(authEmail, currentPassword))) {
    const message = session.mustChangePassword ? "The one-time password is not correct." : "Your current password is not correct.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { error } = await admin.auth.admin.updateUserById(session.userId, { password: newPassword });
  if (error) return NextResponse.json({ error: "Could not change the password. Please try again." }, { status: 400 });

  await admin.from("admin_profiles").update({ must_change_password: false }).eq("id", session.userId);
  await logActivity(session.userId, "staff", "change password", "admin_profile", session.userId);
  return NextResponse.json({ ok: true });
}
