import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, logActivity, publishGuard, dbError } from "@/lib/api-auth";
import { applyBinDelete, restoreRow, splitRemoved } from "@/lib/recycle";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireStaff("faq", "view");
  if (error) return error;

  const admin = createAdminClient();
  const { data: groupRows, error: gErr } = await admin.from("faq_groups").select("*").order("sort_order");
  if (gErr) return NextResponse.json({ error: dbError(gErr) }, { status: 500 });

  const { data: itemRows, error: iErr } = await admin.from("faq_items").select("*").order("sort_order");
  if (iErr) return NextResponse.json({ error: dbError(iErr) }, { status: 500 });

  const groups = splitRemoved(groupRows ?? []);
  const questions = splitRemoved(itemRows ?? []);
  const hiddenGroups = new Set(groups.removed.map((group) => group.id));
  return NextResponse.json({
    groups: groups.items,
    items: questions.items.filter((item) => !hiddenGroups.has(item.group_id)),
    removed: [
      ...groups.removed.map((group) => ({ id: group.id, title: group.title, kind: "group" })),
      ...questions.removed.map((item) => ({ id: item.id, title: item.question, kind: "item" })),
    ],
  });
}

export async function PUT(req: NextRequest) {
  const { error, session } = await requireStaff("faq", "edit");
  if (error || !session) return error;

  const body = await req.json();
  const admin = createAdminClient();
  if (body.action === "restore") {
    const table = body.type === "group" ? "faq_groups" : "faq_items";
    const { error: restoreErr } = await restoreRow(admin, table, String(body.id ?? ""));
    if (restoreErr) return NextResponse.json({ error: dbError(restoreErr) }, { status: 500 });
    await logActivity(session.userId, "faq", "restore", table === "faq_groups" ? "faq_group" : "faq_item", String(body.id ?? ""));
    return NextResponse.json({ ok: true });
  }
  const denied = publishGuard(session, "faq", body.status ?? "published");
  if (denied) return denied;

  if (body.type === "group") {
    const { error: upErr } = await admin.from("faq_groups").upsert({
      id: body.id,
      title: body.title,
      sort_order: body.sort_order ?? 0,
      status: body.status ?? "published",
      updated_by: session.userId,
    });
    if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
    await logActivity(session.userId, "faq", "upsert", "faq_group", body.id);
    return NextResponse.json({ ok: true });
  }

  if (body.type === "item") {
    const row = {
      id: body.id,
      group_id: body.group_id,
      question: body.question,
      answer: body.answer,
      sort_order: body.sort_order ?? 0,
      status: body.status ?? "published",
      updated_by: session.userId,
    };
    const { error: upErr } = await admin.from("faq_items").upsert(row);
    if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
    await logActivity(session.userId, "faq", "upsert", "faq_item", body.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

/** Removes one question, or a whole group together with its questions. */
export async function DELETE(req: NextRequest) {
  const { error, session } = await requireStaff("faq", "delete");
  if (error || !session) return error;

  const params = new URL(req.url).searchParams;
  const id = params.get("id");
  const type = params.get("type") === "group" ? "group" : "item";
  if (!id) return NextResponse.json({ error: "Nothing was selected." }, { status: 400 });

  const permanent = params.get("permanent") === "1";
  const table = type === "group" ? "faq_groups" : "faq_items";
  const { error: delErr } = await applyBinDelete(createAdminClient(), table, id, permanent);
  if (delErr?.code === "bin") return NextResponse.json({ error: delErr.message }, { status: 400 });
  if (delErr) return NextResponse.json({ error: dbError(delErr) }, { status: 500 });
  await logActivity(session.userId, "faq", permanent ? "purge" : "delete", type === "group" ? "faq_group" : "faq_item", id);
  return NextResponse.json({ ok: true });
}
