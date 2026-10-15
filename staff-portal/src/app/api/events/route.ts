import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, logActivity, publishGuard } from "@/lib/api-auth";
import { slugify } from "@/lib/events";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireStaff("events", "view");
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from("event_items")
    .select("*")
    .order("event_date", { ascending: false });

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireStaff("events", "edit");
  if (error || !session) return error;

  const body = await req.json();
  const denied = publishGuard(session, "events", body.status ?? "draft");
  if (denied) return denied;
  const admin = createAdminClient();
  const slug = (body.slug || slugify(body.title || "event")).trim();
  const status = body.status ?? "draft";
  const row = {
    id: body.id || crypto.randomUUID(),
    slug,
    title: body.title,
    theme: body.theme ?? null,
    event_date: body.event_date,
    time_start: body.time_start ?? null,
    time_end: body.time_end ?? null,
    timezone: body.timezone ?? "Africa/Nairobi",
    venue: body.venue ?? null,
    description: body.description ?? null,
    summary: body.summary ?? null,
    image_path: body.image_path ?? null,
    body_html: body.body_html ?? null,
    status,
    published_at: status === "published" ? new Date().toISOString() : null,
    updated_by: session.userId,
  };

  const { data, error: upErr } = await admin.from("event_items").upsert(row).select("id").single();
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  await logActivity(session.userId, "events", "upsert", "event_item", data?.id ?? slug);
  return NextResponse.json({ ok: true, id: data?.id });
}

export async function DELETE(req: NextRequest) {
  const { error, session } = await requireStaff("events", "delete");
  if (error || !session) return error;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = createAdminClient();
  const { error: delErr } = await admin.from("event_items").delete().eq("id", id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  await logActivity(session.userId, "events", "delete", "event_item", id);
  return NextResponse.json({ ok: true });
}
