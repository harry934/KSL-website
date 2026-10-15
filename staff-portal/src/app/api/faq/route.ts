import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, logActivity, publishGuard } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireStaff("faq", "view");
  if (error) return error;

  const admin = createAdminClient();
  const { data: groups, error: gErr } = await admin
    .from("faq_groups")
    .select("*")
    .order("sort_order");

  if (gErr) return NextResponse.json({ error: gErr.message }, { status: 500 });

  const { data: items, error: iErr } = await admin.from("faq_items").select("*").order("sort_order");

  if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });

  return NextResponse.json({ groups: groups ?? [], items: items ?? [] });
}

export async function PUT(req: NextRequest) {
  const { error, session } = await requireStaff("faq", "edit");
  if (error || !session) return error;

  const body = await req.json();
  const denied = publishGuard(session, "faq", body.status ?? "published");
  if (denied) return denied;
  const admin = createAdminClient();

  if (body.type === "group") {
    const { error: upErr } = await admin.from("faq_groups").upsert({
      id: body.id,
      title: body.title,
      sort_order: body.sort_order ?? 0,
      status: body.status ?? "published",
      updated_by: session.userId,
    });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
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
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    await logActivity(session.userId, "faq", "upsert", "faq_item", body.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
