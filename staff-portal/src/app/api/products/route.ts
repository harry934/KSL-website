import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, logActivity, publishGuard, dbError } from "@/lib/api-auth";
import { slugify } from "@/lib/news";
import { applyBinDelete, restoreRow, splitRemoved } from "@/lib/recycle";
import { releaseUnusedValues, rememberFiles } from "@/lib/storage-files";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireStaff("products", "view");
  if (error) return error;

  const admin = createAdminClient();
  const [settingsRes, itemsRes] = await Promise.all([
    admin.from("products_settings").select("*").eq("id", "default").maybeSingle(),
    admin.from("products").select("*").order("sort_order", { ascending: true }),
  ]);
  if (settingsRes.error) return NextResponse.json({ error: settingsRes.error.message }, { status: 500 });
  if (itemsRes.error) return NextResponse.json({ error: itemsRes.error.message }, { status: 500 });

  const split = splitRemoved(itemsRes.data ?? []);
  return NextResponse.json({ settings: settingsRes.data, items: split.items, removed: split.removed });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireStaff("products", "edit");
  if (error || !session) return error;

  const body = await req.json().catch(() => ({}));
  const admin = createAdminClient();
  if (body.action === "restore") {
    const { error: restoreErr } = await restoreRow(admin, "products", String(body.id ?? ""));
    if (restoreErr) return NextResponse.json({ error: dbError(restoreErr) }, { status: 500 });
    await logActivity(session.userId, "products", "restore", "product", String(body.id ?? ""));
    return NextResponse.json({ ok: true });
  }

  if (body.scope === "settings") {
    const { error: upErr } = await admin.from("products_settings").upsert({
      id: "default",
      kicker: body.kicker ?? null,
      title: body.title ?? null,
      intro: body.intro ?? null,
      catalogue_url: body.catalogue_url ?? null,
      range_kicker: body.range_kicker ?? null,
      range_title: body.range_title ?? null,
      range_groups: Array.isArray(body.range_groups) ? body.range_groups : [],
    });
    if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
    await logActivity(session.userId, "products", "update", "products_settings", "default");
    return NextResponse.json({ ok: true });
  }

  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  const status = body.status ?? "draft";
  const denied = publishGuard(session, "products", status);
  if (denied) return denied;

  const row = {
    id: body.id || crypto.randomUUID(),
    slug: String(body.slug || slugify(name)).trim(),
    name,
    category: String(body.category || "other").trim().toLowerCase(),
    category_label: body.category_label || null,
    eyebrow: body.eyebrow || null,
    image_path: body.image_path || null,
    image_alt: body.image_alt || null,
    key_specs: Array.isArray(body.key_specs) ? body.key_specs : [],
    extra_specs: Array.isArray(body.extra_specs) ? body.extra_specs : [],
    sort_order: Number(body.sort_order) || 0,
    status,
    updated_by: session.userId,
  };

  const previous = await rememberFiles(admin, "products", body.id, ["image_path"]);
  const { data, error: upErr } = await admin.from("products").upsert(row).select("id").single();
  if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
  await releaseUnusedValues(admin, previous);
  await logActivity(session.userId, "products", status === "published" ? "publish" : "save", "product", data?.id);
  return NextResponse.json({ ok: true, id: data?.id });
}

export async function DELETE(req: NextRequest) {
  const { error, session } = await requireStaff("products", "delete");
  if (error || !session) return error;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Nothing was selected." }, { status: 400 });

  const permanent = new URL(req.url).searchParams.get("permanent") === "1";
  const { error: delErr } = await applyBinDelete(createAdminClient(), "products", id, permanent);
  if (delErr?.code === "bin") return NextResponse.json({ error: delErr.message }, { status: 400 });
  if (delErr) return NextResponse.json({ error: dbError(delErr) }, { status: 500 });
  await logActivity(session.userId, "products", permanent ? "purge" : "delete", "product", id);
  return NextResponse.json({ ok: true });
}
