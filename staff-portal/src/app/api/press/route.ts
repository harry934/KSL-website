import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, logActivity, publishGuard, dbError } from "@/lib/api-auth";
import { applyBinDelete, restoreRow, splitRemoved } from "@/lib/recycle";
import { releaseUnusedValues, rememberFiles } from "@/lib/storage-files";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireStaff("press", "view");
  if (error) return error;

  const admin = createAdminClient();
  const [settingsRes, assetsRes] = await Promise.all([
    admin.from("press_settings").select("*").eq("id", "default").maybeSingle(),
    admin.from("press_assets").select("*").order("sort_order", { ascending: true }),
  ]);

  if (settingsRes.error) return NextResponse.json({ error: settingsRes.error.message }, { status: 500 });
  if (assetsRes.error) return NextResponse.json({ error: assetsRes.error.message }, { status: 500 });

  const split = splitRemoved(assetsRes.data ?? []);
  return NextResponse.json({
    settings: settingsRes.data,
    assets: split.items,
    removed: split.removed,
  });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireStaff("press", "edit");
  if (error || !session) return error;

  const body = await req.json();
  const admin = createAdminClient();
  if (body.action === "restore") {
    const { error: restoreErr } = await restoreRow(admin, "press_assets", String(body.id ?? ""));
    if (restoreErr) return NextResponse.json({ error: dbError(restoreErr) }, { status: 500 });
    await logActivity(session.userId, "press", "restore", "press_asset", String(body.id ?? ""));
    return NextResponse.json({ ok: true });
  }
  const denied = publishGuard(session, "press", body.status ?? "draft");
  if (denied) return denied;

  if (body.scope === "settings") {
    const { error: upErr } = await admin.from("press_settings").upsert({
      id: "default",
      boilerplate: body.boilerplate ?? null,
      contact_email: body.contact_email ?? null,
      contact_phone: body.contact_phone ?? null,
    });
    if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
    await logActivity(session.userId, "press", "upsert", "press_settings", "default");
    return NextResponse.json({ ok: true });
  }

  const row = {
    id: body.id || crypto.randomUUID(),
    title: body.title,
    href: body.href ?? null,
    download_id: body.download_id ?? null,
    asset_type: body.asset_type ?? null,
    sort_order: body.sort_order ?? 0,
    status: body.status ?? "draft",
    updated_by: session.userId,
  };

  const previous = await rememberFiles(admin, "press_assets", body.id, ["href"]);
  const { data, error: upErr } = await admin.from("press_assets").upsert(row).select("id").single();
  if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
  await releaseUnusedValues(admin, previous);
  await logActivity(session.userId, "press", "upsert", "press_asset", data?.id ?? row.id);
  return NextResponse.json({ ok: true, id: data?.id });
}

export async function DELETE(req: NextRequest) {
  const { error, session } = await requireStaff("press", "delete");
  if (error || !session) return error;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Nothing was selected." }, { status: 400 });

  const permanent = new URL(req.url).searchParams.get("permanent") === "1";
  const { error: delErr } = await applyBinDelete(createAdminClient(), "press_assets", id, permanent);
  if (delErr?.code === "bin") return NextResponse.json({ error: delErr.message }, { status: 400 });
  if (delErr) return NextResponse.json({ error: dbError(delErr) }, { status: 500 });
  await logActivity(session.userId, "press", permanent ? "purge" : "delete", "press_asset", id);
  return NextResponse.json({ ok: true });
}
