import { staffGate } from "@/lib/session";
import { signedOutMessage } from "@/lib/staff-session";
import { canAccess, type ModuleKey } from "@/lib/modules";
import { NextResponse } from "next/server";

export function credentialsCurrent(session: { mustChangePassword: boolean; mustChangeUsername: boolean }) {
  if (!session.mustChangePassword && !session.mustChangeUsername) return null;
  return NextResponse.json(
    { error: "Change your sign-in details before continuing." },
    { status: 403 }
  );
}

export async function requireStaff(
  module: ModuleKey | null,
  action: "view" | "edit" | "publish" | "delete"
) {
  const gate = await staffGate();
  if (gate.state !== "ok") {
    const code = gate.state === "suspended" ? "suspended" : gate.reason;
    const error =
      gate.state === "suspended"
        ? "Your account is suspended. Contact an administrator."
        : signedOutMessage(gate.reason) ?? "Please sign in again.";
    return { error: NextResponse.json({ error, code }, { status: 401 }), session: null };
  }
  const session = gate.session;
  const blocked = credentialsCurrent(session);
  if (blocked) return { error: blocked, session: null };
  if (module && !canAccess(session.permissions, module, action, session.isSuperAdmin)) {
    return { error: NextResponse.json({ error: NOT_ALLOWED }, { status: 403 }), session: null };
  }
  if (module === "staff" && !session.isSuperAdmin) {
    return { error: NextResponse.json({ error: NOT_ALLOWED }, { status: 403 }), session: null };
  }
  return { error: null, session };
}

const NOT_ALLOWED = "You are not allowed to do this. Ask an administrator if you need access.";

/** Database errors in words a non-technical editor can act on. */
export function dbError(err: { message?: string; code?: string } | null | undefined) {
  if (err?.code === "23505" || /duplicate key/i.test(err?.message ?? "")) {
    return "Another item already uses this name or web address. Change it slightly and save again.";
  }
  if (err?.code === "23514" || err?.code === "22P02" || err?.code === "22007") {
    return "One of the values is not in the right format. Check the form and try again.";
  }
  if (err?.code === "23502") return "Some required information is missing. Fill in all fields and try again.";
  return "Something went wrong. Please try again.";
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
    { error: "You can save this as hidden (draft). An administrator needs to put it on the website." },
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
