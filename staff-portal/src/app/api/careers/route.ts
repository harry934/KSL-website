import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, logActivity, publishGuard } from "@/lib/api-auth";
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

  return NextResponse.json({
    settings: settingsRes.data,
    listings: listingsRes.data ?? [],
  });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireStaff("careers", "edit");
  if (error || !session) return error;

  const body = await req.json();
  const denied = publishGuard(session, "careers", body.status ?? "draft");
  if (denied) return denied;
  const admin = createAdminClient();

  if (body.scope === "settings") {
    const { error: upErr } = await admin.from("careers_settings").upsert({
      id: "default",
      apply_email: body.apply_email ?? "careers@kenyashipyards.co.ke",
      apply_note: body.apply_note ?? null,
    });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
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
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  await logActivity(session.userId, "careers", "upsert", "career_listing", data?.id ?? row.id);
  return NextResponse.json({ ok: true, id: data?.id });
}

export async function DELETE(req: NextRequest) {
  const { error, session } = await requireStaff("careers", "delete");
  if (error || !session) return error;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = createAdminClient();
  const { error: delErr } = await admin.from("career_listings").delete().eq("id", id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  await logActivity(session.userId, "careers", "delete", "career_listing", id);
  return NextResponse.json({ ok: true });
}
