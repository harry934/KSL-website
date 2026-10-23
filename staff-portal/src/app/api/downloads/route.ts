import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, logActivity, publishGuard, dbError } from "@/lib/api-auth";
import { purgeRecycle, restoreRow, softDelete, splitRemoved } from "@/lib/recycle";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireStaff("downloads", "view");
  if (error) return error;

  const admin = createAdminClient();
  await purgeRecycle(admin, "download_items");
  const [settingsRes, itemsRes] = await Promise.all([
    admin.from("downloads_settings").select("*").eq("id", "default").maybeSingle(),
    admin.from("download_items").select("*").order("sort_order", { ascending: true }),
  ]);

  if (settingsRes.error) return NextResponse.json({ error: settingsRes.error.message }, { status: 500 });
  if (itemsRes.error) return NextResponse.json({ error: itemsRes.error.message }, { status: 500 });

  const split = splitRemoved(itemsRes.data ?? []);
  return NextResponse.json({
    settings: settingsRes.data,
    items: split.items,
    removed: split.removed,
  });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireStaff("downloads", "edit");
  if (error || !session) return error;

  const body = await req.json();
  if (body.action === "restore") {
    const { error: restoreErr } = await restoreRow(createAdminClient(), "download_items", String(body.id ?? ""));
    if (restoreErr) return NextResponse.json({ error: dbError(restoreErr) }, { status: 500 });
    await logActivity(session.userId, "downloads", "restore", "download_item", String(body.id ?? ""));
    return NextResponse.json({ ok: true });
  }
  const denied = publishGuard(session, "downloads", body.status ?? "draft");
  if (denied) return denied;
  const admin = createAdminClient();

  if (body.scope === "settings") {
    const { error: upErr } = await admin.from("downloads_settings").upsert({
      id: "default",
      base_url: body.base_url ?? null,
    });
    if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
    await logActivity(session.userId, "downloads", "upsert", "downloads_settings", "default");
    return NextResponse.json({ ok: true });
  }

  const id = (body.id || "").trim();
  if (!id) return NextResponse.json({ error: "Nothing was selected." }, { status: 400 });

  const source = body.source === "storage" ? "storage" : "standard";
  if (source === "storage" && !String(body.external_href || "").trim()) {
    return NextResponse.json({ error: "Upload the file into storage." }, { status: 400 });
  }
  if (source === "standard" && !String(body.file_name || "").trim()) {
    return NextResponse.json({ error: "Enter the file name in the docs folder." }, { status: 400 });
  }

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
    external_href: source === "storage" ? String(body.external_href).trim() : null,
    source,
    sort_order: body.sort_order ?? 0,
    status: body.status ?? "draft",
    expires_on: body.expires_on ? String(body.expires_on).slice(0, 10) : null,
    file_bytes: body.file_bytes ? Number(body.file_bytes) : null,
    updated_by: session.userId,
  };

  const { error: upErr } = await admin.from("download_items").upsert(row);
  if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
  await logActivity(session.userId, "downloads", "upsert", "download_item", id);
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: NextRequest) {
  const { error, session } = await requireStaff("downloads", "delete");
  if (error || !session) return error;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Nothing was selected." }, { status: 400 });

  const admin = createAdminClient();
  const { error: delErr } = await softDelete(admin, "download_items", id);
  if (delErr) return NextResponse.json({ error: dbError(delErr) }, { status: 500 });
  await logActivity(session.userId, "downloads", "delete", "download_item", id);
  return NextResponse.json({ ok: true });
}
