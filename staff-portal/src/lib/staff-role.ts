/** The name shown next to a person. Administrators keep that title. Everyone else uses the name that was typed. */
export function roleLabel(isSuperAdmin: boolean, title: string | null | undefined) {
  if (isSuperAdmin) return "Administrator";
  const name = (title ?? "").replace(/\s+/g, " ").trim();
  return name || "Staff";
}

export function parseRoleTitle(value: unknown): { title: string | null; error: string | null } {
  const title = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!title) return { title: null, error: "Write the role." };
  if (title.length > 40) return { title: null, error: "Keep the role name under 40 characters." };
  return { title, error: null };
}
