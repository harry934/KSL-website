import { cache } from "react";
import { cookies } from "next/headers";
import { createDatabaseClient } from "@/lib/db-client";
import type { ModulePermission } from "@/lib/modules";
import { liveStaffSession, sessionUserIdForToken } from "@/lib/staff-session-server";
import type { SessionStop } from "@/lib/staff-session";
import { signedStoredFileUrl } from "@/lib/storage";
import { STAFF_SESSION_COOKIE } from "@/lib/staff-session";

/** Long-lived enough for a workday; each page load refreshes the signature. */
export async function avatarUrl(path: string) {
  return signedStoredFileUrl("avatars", path, 60 * 60 * 12);
}

export type StaffSession = {
  userId: string;
  username: string;
  email: string;
  displayName: string;
  roleTitle: string | null;
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
  role_title: string | null;
  is_super_admin: boolean;
  is_active: boolean;
  deleted_at?: string | null;
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
  const jar = await cookies();
  const token = jar.get(STAFF_SESSION_COOKIE)?.value ?? "";
  const userId = await sessionUserIdForToken(token);
  if (!userId) return { state: "out", reason: "missing" };

  const live = await liveStaffSession(userId, true);
  if (!live.ok) {
    if (live.reason === "suspended") return { state: "suspended" };
    return { state: "out", reason: live.reason };
  }

  const { data, error } = await createDatabaseClient()
    .from("admin_profiles")
    .select(
      "display_name, username, contact_email, role_title, is_super_admin, is_active, deleted_at, must_change_password, must_change_username, avatar_path, admin_module_permissions(module_key, can_view, can_edit, can_publish, can_delete)"
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error("Could not load the staff profile");
  const profile = data as ProfileRow | null;
  if (!profile || !profile.is_active || profile.deleted_at) return { state: "suspended" };

  const email = profile.contact_email || "";

  return {
    state: "ok",
    session: {
      userId,
      username: profile.username ?? "",
      email,
      displayName: profile.display_name || profile.username || email || "Staff",
      roleTitle: profile.role_title,
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
