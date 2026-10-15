import { getStaffSession } from "@/lib/session";
import { canAccess, type ModuleKey } from "@/lib/modules";
import { NextResponse } from "next/server";

export async function requireStaff(
  module: ModuleKey | null,
  action: "view" | "edit" | "publish" | "delete"
) {
  const session = await getStaffSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null };
  }
  if (module && !canAccess(session.permissions, module, action, session.isSuperAdmin)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), session: null };
  }
  if (module === "staff" && !session.isSuperAdmin) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), session: null };
  }
  return { error: null, session };
}

/** Agents with edit-only rights may save drafts; going live needs publish rights. */
export function publishGuard(
  session: { permissions: Parameters<typeof canAccess>[0]; isSuperAdmin: boolean },
  module: ModuleKey,
  status: unknown
) {
  if (status !== "published") return null;
  if (canAccess(session.permissions, module, "publish", session.isSuperAdmin)) return null;
  return NextResponse.json(
    { error: "You can save this as a draft. Publishing needs publish permission for this module." },
    { status: 403 }
  );
}

export async function logActivity(
  actorId: string,
  moduleKey: string,
  action: string,
  entityType?: string,
  entityId?: string,
  metadata?: Record<string, unknown>
) {
  const admin = await import("@/lib/supabase/admin").then((m) => m.createAdminClient());
  await admin.from("activity_log").insert({
    actor_id: actorId,
    module_key: moduleKey,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata: metadata ?? {},
  });
}
