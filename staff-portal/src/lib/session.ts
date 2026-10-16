import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ModulePermission } from "@/lib/modules";
import { isInternalEmail } from "@/lib/accounts";

export function avatarUrl(path: string) {
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

export const getStaffSession = cache(async (): Promise<StaffSession | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await createAdminClient()
    .from("admin_profiles")
    .select(
      "display_name, username, contact_email, is_super_admin, is_active, must_change_password, must_change_username, avatar_path, admin_module_permissions(module_key, can_view, can_edit, can_publish, can_delete)"
    )
    .eq("id", user.id)
    .maybeSingle();

  const profile = data as ProfileRow | null;
  if (!profile || !profile.is_active) return null;

  const authEmail = user.email ?? "";
  const email = profile.contact_email || (isInternalEmail(authEmail) ? "" : authEmail);

  return {
    userId: user.id,
    username: profile.username ?? "",
    email,
    displayName: profile.display_name || profile.username || email || "Staff",
    isSuperAdmin: profile.is_super_admin,
    isActive: profile.is_active,
    mustChangePassword: profile.must_change_password,
    mustChangeUsername: profile.must_change_username,
    avatarUrl: profile.avatar_path ? avatarUrl(profile.avatar_path) : null,
    permissions: profile.admin_module_permissions ?? [],
  };
});
