import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, logActivity, publishGuard, dbError } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireStaff("organization", "view");
  if (error) return error;

  const admin = createAdminClient();
  const [settingsRes, leadershipRes, yardsRes] = await Promise.all([
    admin.from("organization_settings").select("*").eq("id", "default").maybeSingle(),
    admin.from("organization_leadership").select("*").order("sort_order", { ascending: true }),
    admin.from("organization_yards").select("*").order("sort_order", { ascending: true }),
  ]);

  if (settingsRes.error) return NextResponse.json({ error: settingsRes.error.message }, { status: 500 });
  if (leadershipRes.error) return NextResponse.json({ error: leadershipRes.error.message }, { status: 500 });
  if (yardsRes.error) return NextResponse.json({ error: yardsRes.error.message }, { status: 500 });

  return NextResponse.json({
    settings: settingsRes.data,
    leadership: leadershipRes.data ?? [],
    yards: yardsRes.data ?? [],
  });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireStaff("organization", "edit");
  if (error || !session) return error;

  const body = await req.json();
  const denied = publishGuard(session, "organization", body.status ?? "draft");
  if (denied) return denied;
  const admin = createAdminClient();

  if (body.scope === "settings") {
    const { error: upErr } = await admin.from("organization_settings").upsert({
      id: "default",
      chart_download_id: body.chart_download_id ?? null,
    });
    if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
    await logActivity(session.userId, "organization", "upsert", "organization_settings", "default");
    return NextResponse.json({ ok: true });
  }

  const id = body.id || crypto.randomUUID();

  if (body.scope === "yard") {
    const { data, error: upErr } = await admin
      .from("organization_yards")
      .upsert({
        id,
        name: body.name,
        lead: body.lead ?? null,
        summary: body.summary ?? null,
        sort_order: body.sort_order ?? 0,
        status: body.status ?? "draft",
        updated_by: session.userId,
      })
      .select("id")
      .single();
    if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
    await logActivity(session.userId, "organization", "upsert", "organization_yards", data?.id ?? id);
    return NextResponse.json({ ok: true, id: data?.id });
  }

  const { data, error: upErr } = await admin
    .from("organization_leadership")
    .upsert({
      id,
      role: body.role,
      summary: body.summary ?? null,
      sort_order: body.sort_order ?? 0,
      status: body.status ?? "draft",
      updated_by: session.userId,
    })
    .select("id")
    .single();
  if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
  await logActivity(session.userId, "organization", "upsert", "organization_leadership", data?.id ?? id);
  return NextResponse.json({ ok: true, id: data?.id });
}

export async function DELETE(req: NextRequest) {
  const { error, session } = await requireStaff("organization", "delete");
  if (error || !session) return error;

  const id = new URL(req.url).searchParams.get("id");
  const scope = new URL(req.url).searchParams.get("scope");
  if (!id || !scope) return NextResponse.json({ error: "id and scope required" }, { status: 400 });

  const table = scope === "yard" ? "organization_yards" : "organization_leadership";
  const admin = createAdminClient();
  const { error: delErr } = await admin.from(table).delete().eq("id", id);
  if (delErr) return NextResponse.json({ error: dbError(delErr) }, { status: 500 });
  await logActivity(session.userId, "organization", "delete", table, id);
  return NextResponse.json({ ok: true });
}
