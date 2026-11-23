import { staffGate } from "@/lib/session";
import { canAccess, type ModuleKey } from "@/lib/modules";
import { dbError, newRequestId } from "@/lib/db-errors";
import { NextResponse } from "next/server";

export { dbError, newRequestId } from "@/lib/db-errors";

export function credentialsCurrent(
  session: { mustChangePassword: boolean; mustChangeUsername: boolean; mustSetupTotp?: boolean },
  options?: { allowTotpSetup?: boolean },
) {
  if (session.mustChangePassword || session.mustChangeUsername) {
    return NextResponse.json({ error: "Change your sign-in details before continuing." }, { status: 403 });
  }
  if (session.mustSetupTotp && !options?.allowTotpSetup) {
    return NextResponse.json({ error: "Set up your authenticator app before continuing." }, { status: 403 });
  }
  return null;
}

export async function requireStaff(
  module: ModuleKey | null,
  action: "view" | "edit" | "publish" | "delete"
) {
  const gate = await staffGate();
  if (gate.state !== "ok") {
    return { error: NextResponse.json({ error: "Please sign in again." }, { status: 401 }), session: null };
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

/** Staff JSON error with optional requestId. Never put SQL or secrets in `error`. */
export function jsonError(
  message: string,
  status: number,
  options: { requestId?: string; logDetail?: unknown } = {}
) {
  const requestId = options.requestId ?? newRequestId();
  if (options.logDetail !== undefined) {
    console.error(`[${requestId}]`, options.logDetail);
  }
  return NextResponse.json({ error: message, requestId }, { status });
}

/** Convenience when a route wants both a safe message and a logged detail. */
export function dbFailure(err: { message?: string; code?: string } | null | undefined, fallback?: string) {
  return jsonError(fallback ?? dbError(err), 500, { logDetail: err });
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
  const admin = await import("@/lib/db-client").then((m) => m.createDatabaseClient());
  await admin.from("activity_log").insert({
    actor_id: actorId,
    module_key: moduleKey,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata: metadata ?? {},
  });
}
