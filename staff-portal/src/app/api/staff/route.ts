import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, logActivity } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { error, session } = await requireStaff("staff", "view");
  if (error || !session?.isSuperAdmin) {
    return error ?? NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: profiles, error: dbError } = await admin
    .from("admin_profiles")
    .select("id, display_name, is_super_admin, is_active, created_at")
    .order("created_at", { ascending: false });

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  const ids = (profiles ?? []).map((p) => p.id);
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 200 });
  const emailById = new Map(users.users.map((u) => [u.id, u.email]));

  const { data: allPerms } = await admin
    .from("admin_module_permissions")
    .select("*")
    .in("profile_id", ids);

  const list = (profiles ?? []).map((p) => ({
    ...p,
    email: emailById.get(p.id) ?? "",
    permissions: (allPerms ?? []).filter((perm) => perm.profile_id === p.id),
  }));

  return NextResponse.json({ staff: list });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireStaff("staff", "edit");
  if (error || !session?.isSuperAdmin) {
    return error ?? NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const displayName = String(body.displayName ?? "").trim() || email;
  const permissions = Array.isArray(body.permissions) ? body.permissions : [];

  if (!email || password.length < 8) {
    return NextResponse.json({ error: "Email and password (8+ chars) required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    return NextResponse.json({ error: createError?.message ?? "Create failed" }, { status: 400 });
  }

  const userId = created.user.id;
  const { error: profileError } = await admin.from("admin_profiles").insert({
    id: userId,
    display_name: displayName,
    is_super_admin: false,
    is_active: true,
    created_by: session.userId,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (permissions.length) {
    const rows = permissions.map((p: Record<string, unknown>) => ({
      profile_id: userId,
      module_key: p.module_key,
      can_view: !!p.can_view,
      can_edit: !!p.can_edit,
      can_publish: !!p.can_publish,
      can_delete: !!p.can_delete,
    }));
    await admin.from("admin_module_permissions").insert(rows);
  }

  await logActivity(session.userId, "staff", "create", "admin_profile", userId, { email });

  return NextResponse.json({ id: userId });
}
