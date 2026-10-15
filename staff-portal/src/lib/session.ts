import { createClient } from "@/lib/supabase/server";
import type { ModulePermission } from "@/lib/modules";

export type StaffSession = {
  userId: string;
  email: string;
  displayName: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  permissions: ModulePermission[];
};

export async function getStaffSession(): Promise<StaffSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = await import("@/lib/supabase/admin").then((m) => m.createAdminClient());
  const { data: profile } = await admin
    .from("admin_profiles")
    .select("display_name, is_super_admin, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) {
    return null;
  }

  const { data: perms } = await admin
    .from("admin_module_permissions")
    .select("module_key, can_view, can_edit, can_publish, can_delete")
    .eq("profile_id", user.id);

  return {
    userId: user.id,
    email: user.email ?? "",
    displayName: profile.display_name || user.email || "Staff",
    isSuperAdmin: profile.is_super_admin,
    isActive: profile.is_active,
    permissions: (perms ?? []) as ModulePermission[],
  };
}
