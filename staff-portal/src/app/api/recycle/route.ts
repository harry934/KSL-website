import { createDatabaseClient } from "@/lib/db-client";
import { requireStaff, logActivity, dbError } from "@/lib/api-auth";
import { canAccess } from "@/lib/modules";
import { applyBinDelete, listBinItems, purgeStaffAccount, restoreRow, restoreStaffAccount, type RecycleTable } from "@/lib/recycle";
import { RECYCLE_SOURCES } from "@/lib/recycle-sources";
import { NextRequest, NextResponse } from "next/server";

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET() {
  const { error, session } = await requireStaff(null, "view");
  if (error || !session) return error;

  const bin = await listBinItems(session);
  if (bin.error) return NextResponse.json({ error: bin.error }, { status: 500 });
  return NextResponse.json({ items: bin.items });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireStaff(null, "view");
  if (error || !session) return error;

  const body = await req.json().catch(() => ({}));
  const action = body.action === "purge" ? "purge" : body.action === "restore" ? "restore" : "";
  if (!action) return NextResponse.json({ error: "That item was not found." }, { status: 400 });

  const rawItems = Array.isArray(body.items)
    ? body.items
    : body.id && body.table
      ? [{ id: body.id, table: body.table }]
      : [];

  const targets: { id: string; table: string; source: (typeof RECYCLE_SOURCES)[number] }[] = [];
  for (const entry of rawItems) {
    const id = String(entry?.id ?? "");
    const source = RECYCLE_SOURCES.find((row) => row.table === entry?.table);
    if (!source || !ID.test(id)) {
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
    targets.push({ id, table: source.table, source });
  }

  if (!targets.length) return NextResponse.json({ error: "Nothing was selected." }, { status: 400 });

  const admin = createDatabaseClient();
  for (const target of targets) {
    if (action === "restore") {
      const { error: restoreErr } =
        target.table === "admin_profiles"
          ? await restoreStaffAccount(admin, target.id)
          : await restoreRow(admin, target.table as RecycleTable, target.id);
      if (restoreErr?.code === "bin" || restoreErr?.code === "restore") {
        return NextResponse.json({ error: restoreErr.message }, { status: restoreErr.code === "bin" ? 400 : 500 });
      }
      if (restoreErr) return NextResponse.json({ error: dbError(restoreErr) }, { status: 500 });
      await logActivity(session.userId, target.source.module, "restore", target.source.entityType, target.id);
      continue;
    }

    const { error: deleteErr } =
      target.table === "admin_profiles"
        ? await purgeStaffAccount(admin, target.id)
        : await applyBinDelete(admin, target.table as RecycleTable, target.id, true);
    if (deleteErr?.code === "bin" || deleteErr?.code === "delete") {
      return NextResponse.json({ error: deleteErr.message }, { status: deleteErr.code === "bin" ? 400 : 500 });
    }
    if (deleteErr) return NextResponse.json({ error: dbError(deleteErr) }, { status: 500 });
    await logActivity(session.userId, target.source.module, "purge", target.source.entityType, target.id);
  }

  return NextResponse.json({ ok: true, count: targets.length });
}
