import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, logActivity, publishGuard, dbError } from "@/lib/api-auth";
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

  return NextResponse.json({
    settings: settingsRes.data,
    assets: assetsRes.data ?? [],
  });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireStaff("press", "edit");
  if (error || !session) return error;

  const body = await req.json();
  const denied = publishGuard(session, "press", body.status ?? "draft");
  if (denied) return denied;
  const admin = createAdminClient();

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

  const { data, error: upErr } = await admin.from("press_assets").upsert(row).select("id").single();
  if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
  await logActivity(session.userId, "press", "upsert", "press_asset", data?.id ?? row.id);
  return NextResponse.json({ ok: true, id: data?.id });
}

export async function DELETE(req: NextRequest) {
  const { error, session } = await requireStaff("press", "delete");
  if (error || !session) return error;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Nothing was selected." }, { status: 400 });

  const admin = createAdminClient();
  const { error: delErr } = await admin.from("press_assets").delete().eq("id", id);
  if (delErr) return NextResponse.json({ error: dbError(delErr) }, { status: 500 });
  await logActivity(session.userId, "press", "delete", "press_asset", id);
  return NextResponse.json({ ok: true });
}
