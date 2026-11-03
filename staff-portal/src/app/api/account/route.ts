import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffSession } from "@/lib/session";
import { normalizeUsername, validateEmail, validateUsername } from "@/lib/accounts";
import { authEmailFor } from "@/lib/auth-server";
import { credentialsCurrent, logActivity } from "@/lib/api-auth";

export async function PATCH(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const blocked = credentialsCurrent(session);
  if (blocked) return blocked;

  const body = await req.json().catch(() => ({}));
  const username = session.isSuperAdmin ? normalizeUsername(body.username) : session.username;
  const contactEmail = String(body.contactEmail ?? "").trim().toLowerCase() || null;
  const displayName = String(body.displayName ?? "").trim() || username;

  const problem = validateUsername(username) ?? validateEmail(contactEmail ?? "");
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const admin = createAdminClient();
  if (username !== session.username) {
    const { data: taken } = await admin
      .from("admin_profiles")
      .select("id")
      .eq("username", username)
      .neq("id", session.userId)
      .maybeSingle();
    if (taken) return NextResponse.json({ error: "This username isn't available. Please try another." }, { status: 409 });
  }

  const { error: authError } = await admin.auth.admin.updateUserById(session.userId, {
    email: authEmailFor(username, contactEmail),
    email_confirm: true,
  });
  if (authError) {
    const message = /already/i.test(authError.message)
      ? "That contact email is already used by another account."
      : "Could not save your details. Please try again.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { error } = await admin
    .from("admin_profiles")
    .update({ username, contact_email: contactEmail, display_name: displayName })
    .eq("id", session.userId);
  if (error) return NextResponse.json({ error: "Could not save your details. Please try again." }, { status: 500 });

  await logActivity(session.userId, "staff", "update profile", "admin_profile", session.userId);
  return NextResponse.json({ ok: true });
}
