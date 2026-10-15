import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, logActivity } from "@/lib/api-auth";
import { normalizeUsername, validateEmail, validatePassword, validateUsername } from "@/lib/accounts";
import { authEmailFor } from "@/lib/auth-server";
import { MODULE_LABELS, type ModuleKey } from "@/lib/modules";
import { NextRequest, NextResponse } from "next/server";

type PermInput = {
  module_key: ModuleKey;
  can_view?: boolean;
  can_edit?: boolean;
  can_publish?: boolean;
  can_delete?: boolean;
};

function permissionRows(profileId: string, input: unknown) {
  if (!Array.isArray(input)) return [];
  return (input as PermInput[])
    .filter((p) => p && p.module_key in MODULE_LABELS && p.module_key !== "staff")
    .filter((p) => p.can_view || p.can_edit || p.can_publish || p.can_delete)
    .map((p) => ({
      profile_id: profileId,
      module_key: p.module_key,
      // Edit, publish or delete rights imply the agent can open the module.
      can_view: !!(p.can_view || p.can_edit || p.can_publish || p.can_delete),
      can_edit: !!p.can_edit,
      can_publish: !!p.can_publish,
      can_delete: !!p.can_delete,
    }));
}

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

  const admin = createAdminClient();
  const { data, error: dbError } = await admin
    .from("admin_profiles")
    .select(
      "id, username, display_name, contact_email, is_super_admin, is_active, must_change_password, created_at, permissions:admin_module_permissions(module_key, can_view, can_edit, can_publish, can_delete)"
    )
    .order("created_at", { ascending: false });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ staff: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireSuperAdmin("edit");
  if (error || !session) return error;

  const body = await req.json().catch(() => ({}));
  const username = normalizeUsername(body.username);
  const contactEmail = String(body.email ?? "").trim().toLowerCase() || null;
  const password = String(body.password ?? "");
  const displayName = String(body.displayName ?? "").trim() || username;

  const problem = validateUsername(username) ?? validateEmail(contactEmail ?? "") ?? validatePassword(password);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const admin = createAdminClient();
  const { data: taken } = await admin.from("admin_profiles").select("id").eq("username", username).maybeSingle();
  if (taken) return NextResponse.json({ error: "That username is already taken." }, { status: 409 });

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: authEmailFor(username, contactEmail),
    password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    const message = /already/i.test(createError?.message ?? "")
      ? "That email is already used by another account."
      : createError?.message ?? "Create failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const userId = created.user.id;
  const { error: profileError } = await admin.from("admin_profiles").insert({
    id: userId,
    username,
    contact_email: contactEmail,
    display_name: displayName,
    is_super_admin: false,
    is_active: true,
    must_change_password: true,
    created_by: session.userId,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const rows = permissionRows(userId, body.permissions);
  if (rows.length) await admin.from("admin_module_permissions").insert(rows);

  await logActivity(session.userId, "staff", "create", "admin_profile", userId, { username });
  return NextResponse.json({ id: userId });
}

export async function PATCH(req: NextRequest) {
  const { error, session } = await requireSuperAdmin("edit");
  if (error || !session) return error;

  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "");
  const action = String(body.action ?? "");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("admin_profiles")
    .select("id, username, is_super_admin")
    .eq("id", id)
    .maybeSingle();
  if (!target) return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  if (target.is_super_admin || target.id === session.userId) {
    return NextResponse.json({ error: "Super admin accounts are managed from Account settings." }, { status: 403 });
  }

  if (action === "permissions") {
    await admin.from("admin_module_permissions").delete().eq("profile_id", id);
    const rows = permissionRows(id, body.permissions);
    if (rows.length) {
      const { error: insErr } = await admin.from("admin_module_permissions").insert(rows);
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
  } else if (action === "profile") {
    const displayName = String(body.displayName ?? "").trim() || target.username;
    const contactEmail = String(body.email ?? "").trim().toLowerCase() || null;
    const emailProblem = validateEmail(contactEmail ?? "");
    if (emailProblem) return NextResponse.json({ error: emailProblem }, { status: 400 });
    const { error: authErr } = await admin.auth.admin.updateUserById(id, {
      email: authEmailFor(target.username, contactEmail),
      email_confirm: true,
    });
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 });
    await admin.from("admin_profiles").update({ display_name: displayName, contact_email: contactEmail }).eq("id", id);
  } else if (action === "reset_password") {
    const password = String(body.password ?? "");
    const problem = validatePassword(password);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
    const { error: authErr } = await admin.auth.admin.updateUserById(id, { password });
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 });
    await admin.from("admin_profiles").update({ must_change_password: true }).eq("id", id);
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

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("admin_profiles")
    .select("id, username, is_super_admin")
    .eq("id", id)
    .maybeSingle();
  if (!target) return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  if (target.is_super_admin || target.id === session.userId) {
    return NextResponse.json({ error: "Super admin accounts cannot be deleted." }, { status: 403 });
  }

  await admin.from("activity_log").update({ actor_id: null }).eq("actor_id", id);
  const { error: delErr } = await admin.auth.admin.deleteUser(id);
  if (delErr) {
    return NextResponse.json(
      { error: "This agent has edited website content, so the account cannot be deleted. Suspend it instead." },
      { status: 409 }
    );
  }

  await logActivity(session.userId, "staff", "delete", "admin_profile", id, { username: target.username });
  return NextResponse.json({ ok: true });
}
