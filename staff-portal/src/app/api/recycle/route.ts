import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, logActivity, dbError } from "@/lib/api-auth";
import { canAccess } from "@/lib/modules";
import { applyBinDelete, purgeStaffAccount, restoreRow, restoreStaffAccount, type RecycleTable } from "@/lib/recycle";
import { RECYCLE_SOURCES } from "@/lib/recycle-sources";
import { NextRequest, NextResponse } from "next/server";

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET() {
  const { error, session } = await requireStaff(null, "view");
  if (error || !session) return error;

  const admin = createAdminClient();
  const items: {
    id: string;
    title: string;
    section: string;
    table: string;
    deletedAt: string;
    canRestore: boolean;
    canDelete: boolean;
  }[] = [];

  for (const source of RECYCLE_SOURCES) {
    const canView = canAccess(session.permissions, source.module, "view", session.isSuperAdmin);
    const canDelete = canAccess(session.permissions, source.module, "delete", session.isSuperAdmin);
    if (!canView && !canDelete) continue;
    const { data, error: loadErr } = await admin
      .from(source.table as RecycleTable)
      .select(source.select)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false })
      .limit(100);
    if (loadErr) return NextResponse.json({ error: dbError(loadErr) }, { status: 500 });
    const canRestore = canAccess(session.permissions, source.module, source.restore, session.isSuperAdmin);
    for (const row of (data ?? []) as unknown as Record<string, unknown>[]) {
      const record = row;
      items.push({
        id: String(record.id ?? ""),
        title: source.title(record),
        section: source.section,
        table: source.table,
        deletedAt: String(record.deleted_at ?? ""),
        canRestore,
        canDelete,
      });
    }
  }

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireStaff(null, "view");
  if (error || !session) return error;

  const body = await req.json().catch(() => ({}));
  const action = body.action === "purge" ? "purge" : body.action === "restore" ? "restore" : "";
  const id = String(body.id ?? "");
  const source = RECYCLE_SOURCES.find((entry) => entry.table === body.table);
  if (!action || !source || !ID.test(id)) {
    return NextResponse.json({ error: "That item was not found." }, { status: 400 });
  }

  const allowed = canAccess(
    session.permissions,
    source.module,
    action === "purge" ? "delete" : source.restore,
    session.isSuperAdmin
  );
  if (!allowed) {
    return NextResponse.json({ error: "You are not allowed to do this. Ask an administrator if you need access." }, { status: 403 });
  }

  const admin = createAdminClient();
  if (action === "restore") {
    const { error: restoreErr } =
      source.table === "admin_profiles"
        ? await restoreStaffAccount(admin, id)
        : await restoreRow(admin, source.table as RecycleTable, id);
    if (restoreErr?.code === "bin" || restoreErr?.code === "restore") {
      return NextResponse.json({ error: restoreErr.message }, { status: restoreErr.code === "bin" ? 400 : 500 });
    }
    if (restoreErr) return NextResponse.json({ error: dbError(restoreErr) }, { status: 500 });
    await logActivity(session.userId, source.module, "restore", source.entityType, id);
    return NextResponse.json({ ok: true });
  }

  const { error: deleteErr } =
    source.table === "admin_profiles"
      ? await purgeStaffAccount(admin, id)
      : await applyBinDelete(admin, source.table as RecycleTable, id, true);
  if (deleteErr?.code === "bin" || deleteErr?.code === "delete") {
    return NextResponse.json({ error: deleteErr.message }, { status: deleteErr.code === "bin" ? 400 : 500 });
  }
  if (deleteErr) return NextResponse.json({ error: dbError(deleteErr) }, { status: 500 });
  await logActivity(session.userId, source.module, "purge", source.entityType, id);
  return NextResponse.json({ ok: true });
}
