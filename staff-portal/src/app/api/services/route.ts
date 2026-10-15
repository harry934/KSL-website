import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, logActivity } from "@/lib/api-auth";
import { slugify } from "@/lib/services";
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

  return NextResponse.json({
    intro: settingsRes.data?.intro ?? "",
    download_catalog: settingsRes.data?.download_catalog ?? {},
    items: itemsRes.data ?? [],
  });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireStaff("services", "edit");
  if (error || !session) return error;

  const body = await req.json();
  const admin = createAdminClient();

  if (body.scope === "settings") {
    const { error: upErr } = await admin.from("services_settings").upsert({
      id: "default",
      intro: body.intro ?? "",
      download_catalog: body.download_catalog ?? {},
    });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    await logActivity(session.userId, "services", "upsert", "services_settings", "default");
    return NextResponse.json({ ok: true });
  }

  const slug = (body.slug || slugify(body.title || "service")).trim();
  const status = body.status ?? "draft";
  const row = {
    id: body.id || crypto.randomUUID(),
    slug,
    category: body.category ?? null,
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

  const { data, error: upErr } = await admin.from("service_items").upsert(row).select("id").single();
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  await logActivity(session.userId, "services", "upsert", "service_item", data?.id ?? slug);
  return NextResponse.json({ ok: true, id: data?.id });
}

export async function DELETE(req: NextRequest) {
  const { error, session } = await requireStaff("services", "delete");
  if (error || !session) return error;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = createAdminClient();
  const { error: delErr } = await admin.from("service_items").delete().eq("id", id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  await logActivity(session.userId, "services", "delete", "service_item", id);
  return NextResponse.json({ ok: true });
}
