import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, logActivity, publishGuard, dbError } from "@/lib/api-auth";
import { slugify } from "@/lib/services";
import { cleanGroupOrder, rememberGroup } from "@/lib/group-order";
import { applyBinDelete, restoreRow, splitRemoved } from "@/lib/recycle";
import { releaseUnusedValues, rememberFiles } from "@/lib/storage-files";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireStaff("services", "view");
  if (error) return error;

  const admin = createAdminClient();
  const [settingsRes, itemsRes] = await Promise.all([
    admin.from("services_settings").select("*").eq("id", "default").maybeSingle(),
    admin.from("service_items").select("*").order("sort_order", { ascending: true }),
  ]);

  if (settingsRes.error) return NextResponse.json({ error: settingsRes.error.message }, { status: 500 });
  if (itemsRes.error) return NextResponse.json({ error: itemsRes.error.message }, { status: 500 });

  const split = splitRemoved(itemsRes.data ?? []);
  return NextResponse.json({
    intro: settingsRes.data?.intro ?? "",
    download_catalog: settingsRes.data?.download_catalog ?? {},
    group_order: Array.isArray(settingsRes.data?.group_order) ? settingsRes.data.group_order : [],
    items: split.items,
    removed: split.removed,
  });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireStaff("services", "edit");
  if (error || !session) return error;

  const body = await req.json();
  const admin = createAdminClient();
  if (body.action === "restore") {
    const { error: restoreErr } = await restoreRow(admin, "service_items", String(body.id ?? ""));
    if (restoreErr) return NextResponse.json({ error: dbError(restoreErr) }, { status: 500 });
    await logActivity(session.userId, "services", "restore", "service_item", String(body.id ?? ""));
    return NextResponse.json({ ok: true });
  }
  const denied = publishGuard(session, "services", body.status ?? "draft");
  if (denied) return denied;

  if (body.scope === "groups") {
    const group_order = cleanGroupOrder(body.group_order);
    const { error: upErr } = await admin.from("services_settings").upsert({ id: "default", group_order });
    if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
    await logActivity(session.userId, "services", "reorder", "services_settings", "groups");
    return NextResponse.json({ ok: true });
  }

  if (body.scope === "settings") {
    const { error: upErr } = await admin.from("services_settings").upsert({
      id: "default",
      intro: body.intro ?? "",
      download_catalog: body.download_catalog ?? {},
    });
    if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
    await logActivity(session.userId, "services", "upsert", "services_settings", "default");
    return NextResponse.json({ ok: true });
  }

  const slug = (body.slug || slugify(body.title || "service")).trim();
  const status = body.status ?? "draft";
  const row = {
    id: body.id || crypto.randomUUID(),
    slug,
    category: String(body.category ?? "").trim() || null,
    title: body.title,
    excerpt: body.excerpt ?? null,
    detail: body.detail ?? null,
    image_path: body.image_path ?? null,
    downloads: body.downloads ?? [],
    source_popup_id: body.source_popup_id ?? null,
    sort_order: body.sort_order ?? 0,
    status,
    updated_by: session.userId,
  };

  const previous = await rememberFiles(admin, "service_items", body.id, ["image_path"]);
  const { data, error: upErr } = await admin.from("service_items").upsert(row).select("id").single();
  if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
  if (row.category) await rememberGroup(admin, "services_settings", row.category);
  await releaseUnusedValues(admin, previous);
  await logActivity(session.userId, "services", "upsert", "service_item", data?.id ?? slug);
  return NextResponse.json({ ok: true, id: data?.id });
}

export async function DELETE(req: NextRequest) {
  const { error, session } = await requireStaff("services", "delete");
  if (error || !session) return error;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Nothing was selected." }, { status: 400 });

  const permanent = new URL(req.url).searchParams.get("permanent") === "1";
  const { error: delErr } = await applyBinDelete(createAdminClient(), "service_items", id, permanent);
  if (delErr?.code === "bin") return NextResponse.json({ error: delErr.message }, { status: 400 });
  if (delErr) return NextResponse.json({ error: dbError(delErr) }, { status: 500 });
  await logActivity(session.userId, "services", permanent ? "purge" : "delete", "service_item", id);
  return NextResponse.json({ ok: true });
}
