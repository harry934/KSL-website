import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ModulePermission } from "@/lib/modules";
import { isInternalEmail } from "@/lib/accounts";
import { liveStaffSession } from "@/lib/staff-session-server";
import type { SessionStop } from "@/lib/staff-session";

export async function avatarUrl(path: string) {
  const admin = createAdminClient();
  const folder = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
  const name = path.slice(folder.length + (folder ? 1 : 0));
  const { data: listed, error } = await admin.storage.from("avatars").list(folder, { search: name, limit: 10 });
  const stored = !error && listed?.some((item) => item.name === name);
  if (stored) {
    const { data } = await admin.storage.from("avatars").createSignedUrl(path, 60 * 60);
    if (data?.signedUrl) return data.signedUrl;
  }
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media-public/${path}`;
}

export type StaffSession = {
  userId: string;
  username: string;
  email: string;
  displayName: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  mustChangePassword: boolean;
  mustChangeUsername: boolean;
  avatarUrl: string | null;
  permissions: ModulePermission[];
};

type ProfileRow = {
  display_name: string;
  username: string | null;
  contact_email: string | null;
  is_super_admin: boolean;
  is_active: boolean;
  must_change_password: boolean;
  must_change_username: boolean;
  avatar_path: string | null;
  admin_module_permissions: ModulePermission[] | null;
};

export type StaffGate =
  | { state: "ok"; session: StaffSession }
  | { state: "suspended" }
  | { state: "out"; reason: SessionStop };

export const staffGate = cache(async (): Promise<StaffGate> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { state: "out", reason: "missing" };

  const live = await liveStaffSession(user.id, true);
  if (!live.ok) {
    if (live.reason === "suspended") return { state: "suspended" };
    return { state: "out", reason: live.reason };
  }

  const { data } = await createAdminClient()
    .from("admin_profiles")
    .select(
      "display_name, username, contact_email, is_super_admin, is_active, must_change_password, must_change_username, avatar_path, admin_module_permissions(module_key, can_view, can_edit, can_publish, can_delete)"
    )
    .eq("id", user.id)
    .maybeSingle();

  const profile = data as ProfileRow | null;
  if (!profile || !profile.is_active) return { state: "suspended" };

  const authEmail = user.email ?? "";
  const email = profile.contact_email || (isInternalEmail(authEmail) ? "" : authEmail);

  return {
    state: "ok",
    session: {
      userId: user.id,
      username: profile.username ?? "",
      email,
      displayName: profile.display_name || profile.username || email || "Staff",
      isSuperAdmin: profile.is_super_admin,
      isActive: profile.is_active,
      mustChangePassword: profile.must_change_password,
      mustChangeUsername: profile.must_change_username,
      avatarUrl: profile.avatar_path ? await avatarUrl(profile.avatar_path) : null,
      permissions: profile.admin_module_permissions ?? [],
    },
  };
});

export async function getStaffSession(): Promise<StaffSession | null> {
  const gate = await staffGate();
  return gate.state === "ok" ? gate.session : null;
}
