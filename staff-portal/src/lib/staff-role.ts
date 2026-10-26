import { MODULE_LABELS, type ModuleKey, type ModulePermission } from "@/lib/modules";

export type StaffRole = "admin" | "publisher" | "editor" | "viewer" | "custom";
export type AccessLevel = "none" | "read" | "edit" | "publish" | "full";

export const CONTENT_MODULES = (Object.keys(MODULE_LABELS) as ModuleKey[]).filter((key) => key !== "staff");

export const STAFF_ROLES: { id: StaffRole; label: string; detail: string }[] = [
  { id: "admin", label: "Administrator", detail: "Every section, including other staff." },
  { id: "publisher", label: "Publisher", detail: "Can open, change, publish, and remove in every section." },
  { id: "editor", label: "Editor", detail: "Can open and change every section." },
  { id: "viewer", label: "Viewer", detail: "Can open every section, and cannot change it." },
  { id: "custom", label: "Custom", detail: "Set a level on each section." },
];

export function accessLevel(row: Pick<ModulePermission, "can_view" | "can_edit" | "can_publish" | "can_delete"> | undefined): AccessLevel {
  if (!row || (!row.can_view && !row.can_edit && !row.can_publish && !row.can_delete)) return "none";
  if (row.can_delete) return "full";
  if (row.can_publish) return "publish";
  if (row.can_edit) return "edit";
  if (row.can_view) return "read";
  return "none";
}

export function roleFromAccess(isSuperAdmin: boolean, permissions: ModulePermission[]): StaffRole {
  if (isSuperAdmin) return "admin";
  const levels = CONTENT_MODULES.map((key) => accessLevel(permissions.find((row) => row.module_key === key)));
  if (levels.every((level) => level === "full")) return "publisher";
  if (levels.every((level) => level === "edit")) return "editor";
  if (levels.every((level) => level === "read")) return "viewer";
  return "custom";
}

export function roleTitle(isSuperAdmin: boolean, permissions: ModulePermission[]) {
  const id = roleFromAccess(isSuperAdmin, permissions);
  return STAFF_ROLES.find((role) => role.id === id)?.label ?? "Custom";
}

/** The level a named role writes onto every section. Custom and Administrator keep the current lines. */
export function levelForRole(role: StaffRole): AccessLevel | null {
  if (role === "publisher") return "full";
  if (role === "editor") return "edit";
  if (role === "viewer") return "read";
  return null;
}
