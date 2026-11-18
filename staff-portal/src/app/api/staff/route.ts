import { createDatabaseClient } from "@/lib/db-client";
import { requireStaff, logActivity } from "@/lib/api-auth";
import { normalizeUsername, validateEmail, validateUsername } from "@/lib/accounts";
import { createStaffInvite, permissionRows } from "@/lib/staff-invites";
import { avatarUrl } from "@/lib/session";
import { parseRoleTitle } from "@/lib/staff-role";
import { NextRequest, NextResponse } from "next/server";

async function requireSuperAdmin(action: "view" | "edit" | "delete") {
  const { error, session } = await requireStaff("staff", action);
  if (error || !session?.isSuperAdmin) {
    return { error: error ?? NextResponse.json({ error: "Forbidden" }, { status: 403 }), session: null };
  }
  return { error: null, session };
}

export async function GET() {
  const { error } = await requireSuperAdmin("view");
  if (error) return error;

  const admin = createDatabaseClient();
  const [{ data, error: dbError }, { data: sessions }] = await Promise.all([
    admin
      .from("admin_profiles")
      .select(
        "id, username, display_name, contact_email, is_super_admin, role_title, is_active, must_change_password, avatar_path, created_at, permissions:admin_module_permissions(module_key, can_view, can_edit, can_publish, can_delete)"
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    admin.from("staff_sessions").select("user_id, seen_at"),
  ]);

  if (dbError) return NextResponse.json({ error: "Could not load the staff list." }, { status: 500 });
  const seenByUser = new Map((sessions ?? []).map((row) => [row.user_id as string, (row.seen_at as string | null) ?? null]));
  const staff = await Promise.all(
    (data ?? []).map(async ({ avatar_path, ...row }) => ({
      ...row,
      avatar_url: avatar_path ? await avatarUrl(avatar_path) : null,
      last_seen_at: seenByUser.get(row.id) ?? null,
    }))
  );
  return NextResponse.json({ staff });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireSuperAdmin("edit");
  if (error || !session) return error;

  const body = await req.json().catch(() => ({}));
  const result = await createStaffInvite({
    actorId: session.userId,
    kind: "create",
    email: body.email,
    phone: body.phone,
    superAdmin: body.superAdmin === true,
    roleTitle: body.roleTitle,
    permissions: body.permissions,
  });
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({
    ok: true,
    id: result.id,
    token: result.token,
    passcode: result.passcode,
    expiresAt: result.expiresAt,
    signupUrl: result.signupUrl,
    email: result.email,
    phone: result.phone,
    kind: result.kind,
  });
}

export async function PATCH(req: NextRequest) {
  const { error, session } = await requireSuperAdmin("edit");
  if (error || !session) return error;

  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "");
  const action = String(body.action ?? "");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = createDatabaseClient();
  const { data: target } = await admin
    .from("admin_profiles")
    .select("id, username, is_super_admin, deleted_at")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!target) return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  if (target.id === session.userId) {
    return NextResponse.json({ error: "Change your own details from My account." }, { status: 403 });
  }

  if (action === "set_role") {
    const makeAdmin = body.superAdmin === true;
    if (!makeAdmin && target.is_super_admin) {
      const { count } = await admin
        .from("admin_profiles")
        .select("id", { count: "exact", head: true })
        .eq("is_super_admin", true)
        .is("deleted_at", null);
      if ((count ?? 0) <= 1) {
        return NextResponse.json({ error: "Keep at least one administrator." }, { status: 400 });
      }
    }
    const { error: roleErr } = await admin.from("admin_profiles").update({ is_super_admin: makeAdmin }).eq("id", id);
    if (roleErr) return NextResponse.json({ error: "Could not change this role." }, { status: 500 });
    await logActivity(session.userId, "staff", "set role", "admin_profile", id, {
      username: target.username,
      superAdmin: makeAdmin,
    });
    return NextResponse.json({ ok: true });
  }

  if (target.is_super_admin && action === "permissions") {
    return NextResponse.json({ error: "Change this person to an agent before setting section access." }, { status: 403 });
  }
  if (target.is_super_admin && action !== "profile" && action !== "reset_password") {
    return NextResponse.json({ error: "Change this person to an agent before suspending or limiting them." }, { status: 403 });
  }

  if (action === "permissions") {
    await admin.from("admin_module_permissions").delete().eq("profile_id", id);
    const rows = permissionRows(id, body.permissions);
    if (rows.length) {
      const { error: insErr } = await admin.from("admin_module_permissions").insert(rows);
      if (insErr) return NextResponse.json({ error: "Could not save what this agent can do." }, { status: 500 });
    }
  } else if (action === "profile") {
    const username = body.username === undefined ? target.username : normalizeUsername(body.username);
    const displayName = String(body.displayName ?? "").trim() || username;
    const contactEmail = String(body.email ?? "").trim().toLowerCase() || null;
    const problem = validateUsername(username) ?? validateEmail(contactEmail ?? "");
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
    const willBeAdmin = body.superAdmin === true;
    const role = willBeAdmin ? { title: null, error: null } : parseRoleTitle(body.roleTitle);
    if (role.error) return NextResponse.json({ error: role.error }, { status: 400 });
    if (username !== target.username) {
      const { data: taken } = await admin.from("admin_profiles").select("id").eq("username", username).neq("id", id).maybeSingle();
      if (taken) return NextResponse.json({ error: "This username isn't available. Please try another." }, { status: 409 });
    }
    await admin
      .from("admin_profiles")
      .update({ username, display_name: displayName, contact_email: contactEmail, role_title: role.title })
      .eq("id", id);
  } else if (action === "reset_password") {
    const { data: profile } = await admin
      .from("admin_profiles")
      .select("contact_email")
      .eq("id", id)
      .maybeSingle();
    const result = await createStaffInvite({
      actorId: session.userId,
      kind: "password_reset",
      email: profile?.contact_email,
      phone: body.phone,
      targetProfileId: id,
    });
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({
      ok: true,
      token: result.token,
      passcode: result.passcode,
      expiresAt: result.expiresAt,
      signupUrl: result.signupUrl,
      email: result.email,
      phone: result.phone,
      kind: result.kind,
      username: target.username,
    });
  } else if (action === "set_active") {
    const active = !!body.active;
    await admin.from("admin_profiles").update({ is_active: active }).eq("id", id);
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  await logActivity(session.userId, "staff", action.replace(/_/g, " "), "admin_profile", id, { username: target.username });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { error, session } = await requireSuperAdmin("delete");
  if (error || !session) return error;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = createDatabaseClient();
  const { data: target } = await admin
    .from("admin_profiles")
    .select("id, username, is_super_admin, deleted_at, must_change_password")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!target) return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  if (target.id === session.userId) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 403 });
  }
  // Incomplete setup accounts can be removed even if marked administrator.
  if (target.is_super_admin && !target.must_change_password) {
    return NextResponse.json({ error: "Active administrator accounts cannot be deleted." }, { status: 403 });
  }

  const { error: binErr } = await admin
    .from("admin_profiles")
    .update({
      deleted_at: new Date().toISOString(),
      // Drop admin flag so a binned incomplete invite can be purged for good.
      ...(target.is_super_admin && target.must_change_password ? { is_super_admin: false } : {}),
    })
    .eq("id", id)
    .is("deleted_at", null);
  if (binErr) return NextResponse.json({ error: "Could not delete the account. Please try again." }, { status: 500 });

  await admin.from("staff_sessions").delete().eq("user_id", id);

  await logActivity(session.userId, "staff", "delete", "admin_profile", id, { username: target.username });
  return NextResponse.json({ ok: true });
}
