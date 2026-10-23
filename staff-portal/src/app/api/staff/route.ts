import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, logActivity } from "@/lib/api-auth";
import { normalizeUsername, validateEmail, validateUsername } from "@/lib/accounts";
import { authEmailFor, generateOneTimePassword, oneTimePasswordExpiry, usernameChoices } from "@/lib/auth-server";
import { MODULE_LABELS, type ModuleKey } from "@/lib/modules";
import { avatarUrl } from "@/lib/session";
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
      "id, username, display_name, contact_email, is_super_admin, is_active, must_change_password, avatar_path, created_at, permissions:admin_module_permissions(module_key, can_view, can_edit, can_publish, can_delete)"
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (dbError) return NextResponse.json({ error: "Could not load the staff list." }, { status: 500 });
  const staff = await Promise.all(
    (data ?? []).map(async ({ avatar_path, ...row }) => ({
      ...row,
      avatar_url: avatar_path ? await avatarUrl(avatar_path) : null,
    }))
  );
  return NextResponse.json({ staff });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireSuperAdmin("edit");
  if (error || !session) return error;

  const body = await req.json().catch(() => ({}));
  const contactEmail = String(body.email ?? "").trim().toLowerCase() || null;
  const password = generateOneTimePassword();
  const displayName = String(body.displayName ?? "").trim();
  if (!displayName) return NextResponse.json({ error: "Write the agent's full name." }, { status: 400 });
  const emailProblem = validateEmail(contactEmail ?? "");
  if (emailProblem) return NextResponse.json({ error: emailProblem }, { status: 400 });

  const admin = createAdminClient();
  let username = "";
  for (const candidate of usernameChoices(displayName)) {
    const { data: taken } = await admin.from("admin_profiles").select("id").eq("username", candidate).maybeSingle();
    if (!taken) {
      username = candidate;
      break;
    }
  }
  if (!username) return NextResponse.json({ error: "Could not create a username. Please try again." }, { status: 500 });

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: authEmailFor(username, contactEmail),
    password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    const message = /already/i.test(createError?.message ?? "")
      ? "That contact email is already used by another account."
      : "Could not create the account. Please try again.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const userId = created.user.id;
  const superAdmin = body.superAdmin === true;
  const expiresAt = oneTimePasswordExpiry();
  const { error: profileError } = await admin.from("admin_profiles").insert({
    id: userId,
    username,
    contact_email: contactEmail,
    display_name: displayName,
    is_super_admin: superAdmin,
    is_active: true,
    must_change_password: true,
    must_change_username: true,
    one_time_password_expires_at: expiresAt,
    created_by: session.userId,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: "Could not create the account. Please try again." }, { status: 500 });
  }

  if (!superAdmin) {
    const rows = permissionRows(userId, body.permissions);
    if (rows.length) await admin.from("admin_module_permissions").insert(rows);
  }

  await logActivity(session.userId, "staff", "create", "admin_profile", userId, { username, superAdmin });
  return NextResponse.json({ id: userId, username, oneTimePassword: password, expiresAt });
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
    if (username !== target.username) {
      const { data: taken } = await admin.from("admin_profiles").select("id").eq("username", username).neq("id", id).maybeSingle();
      if (taken) return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
    }
    const { error: authErr } = await admin.auth.admin.updateUserById(id, {
      email: authEmailFor(username, contactEmail),
      email_confirm: true,
    });
    if (authErr) {
      const message = /already/i.test(authErr.message) ? "That contact email is already used by another account." : "Could not save the changes.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    await admin
      .from("admin_profiles")
      .update({ username, display_name: displayName, contact_email: contactEmail })
      .eq("id", id);
  } else if (action === "reset_password") {
    const password = generateOneTimePassword();
    const expiresAt = oneTimePasswordExpiry();
    const { error: authErr } = await admin.auth.admin.updateUserById(id, { password });
    if (authErr) return NextResponse.json({ error: "Could not reset the password. Please try again." }, { status: 400 });
    await admin.from("admin_profiles").update({ must_change_password: true, one_time_password_expires_at: expiresAt }).eq("id", id);
    await logActivity(session.userId, "staff", "reset password", "admin_profile", id, { username: target.username });
    return NextResponse.json({ ok: true, oneTimePassword: password, expiresAt });
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
    .select("id, username, is_super_admin, deleted_at")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!target) return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  if (target.is_super_admin || target.id === session.userId) {
    return NextResponse.json({ error: "Super admin accounts cannot be deleted." }, { status: 403 });
  }

  const { error: binErr } = await admin
    .from("admin_profiles")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);
  if (binErr) return NextResponse.json({ error: "Could not delete the account. Please try again." }, { status: 500 });

  await admin.from("staff_sessions").delete().eq("user_id", id);
  await admin.auth.admin.updateUserById(id, { ban_duration: "876000h" });

  await logActivity(session.userId, "staff", "delete", "admin_profile", id, { username: target.username });
  return NextResponse.json({ ok: true });
}
