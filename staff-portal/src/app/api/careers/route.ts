import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, logActivity, publishGuard, dbError } from "@/lib/api-auth";
import { applyBinDelete, restoreRow, splitRemoved } from "@/lib/recycle";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireStaff("careers", "view");
  if (error) return error;

  const admin = createAdminClient();
  const [settingsRes, listingsRes] = await Promise.all([
    admin.from("careers_settings").select("*").eq("id", "default").maybeSingle(),
    admin.from("career_listings").select("*").order("sort_order", { ascending: true }),
  ]);

  if (settingsRes.error) return NextResponse.json({ error: settingsRes.error.message }, { status: 500 });
  if (listingsRes.error) return NextResponse.json({ error: listingsRes.error.message }, { status: 500 });

  const split = splitRemoved(listingsRes.data ?? []);
  return NextResponse.json({
    settings: settingsRes.data,
    listings: split.items,
    removed: split.removed,
  });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireStaff("careers", "edit");
  if (error || !session) return error;

  const body = await req.json();
  const admin = createAdminClient();
  if (body.action === "restore") {
    const { error: restoreErr } = await restoreRow(admin, "career_listings", String(body.id ?? ""));
    if (restoreErr) return NextResponse.json({ error: dbError(restoreErr) }, { status: 500 });
    await logActivity(session.userId, "careers", "restore", "career_listing", String(body.id ?? ""));
    return NextResponse.json({ ok: true });
  }
  const denied = publishGuard(session, "careers", body.status ?? "draft");
  if (denied) return denied;

  if (body.scope === "settings") {
    const { error: upErr } = await admin.from("careers_settings").upsert({
      id: "default",
      apply_email: body.apply_email ?? "careers@kenyashipyards.co.ke",
      apply_note: body.apply_note ?? null,
    });
    if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
    await logActivity(session.userId, "careers", "upsert", "careers_settings", "default");
    return NextResponse.json({ ok: true });
  }

  const row = {
    id: body.id || crypto.randomUUID(),
    kind: body.kind === "internship" ? "internship" : "vacancy",
    title: body.title,
    location: body.location ?? null,
    summary: body.summary ?? null,
    closing_date: body.closing_date ?? null,
    apply_url: body.apply_url ?? null,
    sort_order: body.sort_order ?? 0,
    status: body.status ?? "draft",
    updated_by: session.userId,
  };

  const { data, error: upErr } = await admin.from("career_listings").upsert(row).select("id").single();
  if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
  await logActivity(session.userId, "careers", "upsert", "career_listing", data?.id ?? row.id);
  return NextResponse.json({ ok: true, id: data?.id });
}

export async function DELETE(req: NextRequest) {
  const { error, session } = await requireStaff("careers", "delete");
  if (error || !session) return error;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Nothing was selected." }, { status: 400 });

  const permanent = new URL(req.url).searchParams.get("permanent") === "1";
  const { error: delErr } = await applyBinDelete(createAdminClient(), "career_listings", id, permanent);
  if (delErr?.code === "bin") return NextResponse.json({ error: delErr.message }, { status: 400 });
  if (delErr) return NextResponse.json({ error: dbError(delErr) }, { status: 500 });
  await logActivity(session.userId, "careers", permanent ? "purge" : "delete", "career_listing", id);
  return NextResponse.json({ ok: true });
}
