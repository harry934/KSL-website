import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, logActivity } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireStaff("downloads", "view");
  if (error) return error;

  const admin = createAdminClient();
  const [settingsRes, itemsRes] = await Promise.all([
    admin.from("downloads_settings").select("*").eq("id", "default").maybeSingle(),
    admin.from("download_items").select("*").order("sort_order", { ascending: true }),
  ]);

  if (settingsRes.error) return NextResponse.json({ error: settingsRes.error.message }, { status: 500 });
  if (itemsRes.error) return NextResponse.json({ error: itemsRes.error.message }, { status: 500 });

  return NextResponse.json({
    settings: settingsRes.data,
    items: itemsRes.data ?? [],
  });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireStaff("downloads", "edit");
  if (error || !session) return error;

  const body = await req.json();
  const admin = createAdminClient();

  if (body.scope === "settings") {
    const { error: upErr } = await admin.from("downloads_settings").upsert({
      id: "default",
      base_url: body.base_url ?? null,
    });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    await logActivity(session.userId, "downloads", "upsert", "downloads_settings", "default");
    return NextResponse.json({ ok: true });
  }

  const id = (body.id || "").trim();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const row = {
    id,
    title: body.title,
    subtitle: body.subtitle ?? null,
    category: body.category,
    category_label: body.category_label,
    language: body.language ?? null,
    doc_date: body.doc_date ?? null,
    file_type: body.file_type ?? null,
    file_name: body.file_name ?? null,
    anchor: body.anchor ?? null,
    alias_of: body.alias_of ?? null,
    external_href: body.external_href ?? null,
    sort_order: body.sort_order ?? 0,
    status: body.status ?? "draft",
    updated_by: session.userId,
  };

  const { error: upErr } = await admin.from("download_items").upsert(row);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  await logActivity(session.userId, "downloads", "upsert", "download_item", id);
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: NextRequest) {
  const { error, session } = await requireStaff("downloads", "delete");
  if (error || !session) return error;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = createAdminClient();
  const { error: delErr } = await admin.from("download_items").delete().eq("id", id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  await logActivity(session.userId, "downloads", "delete", "download_item", id);
  return NextResponse.json({ ok: true });
}
