import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, logActivity, publishGuard, dbError } from "@/lib/api-auth";
import { slugify } from "@/lib/events";
import { purgeRecycle, restoreRow, softDelete, splitRemoved } from "@/lib/recycle";
import { sanitizeRichHtml } from "@/lib/sanitize-html";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireStaff("events", "view");
  if (error) return error;

  const admin = createAdminClient();
  await purgeRecycle(admin, "event_items");
  const { data, error: dbErr } = await admin
    .from("event_items")
    .select("*")
    .order("event_date", { ascending: false });

  if (dbErr) return NextResponse.json({ error: dbError(dbErr) }, { status: 500 });
  return NextResponse.json(splitRemoved(data ?? []));
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireStaff("events", "edit");
  if (error || !session) return error;

  const body = await req.json();
  if (body.action === "restore") {
    const { error: restoreErr } = await restoreRow(createAdminClient(), "event_items", String(body.id ?? ""));
    if (restoreErr) return NextResponse.json({ error: dbError(restoreErr) }, { status: 500 });
    await logActivity(session.userId, "events", "restore", "event_item", String(body.id ?? ""));
    return NextResponse.json({ ok: true });
  }
  const denied = publishGuard(session, "events", body.status ?? "draft");
  if (denied) return denied;
  const admin = createAdminClient();
  const slug = (body.slug || slugify(body.title || "event")).trim();
  const status = body.status ?? "draft";
  const imageAlt = String(body.image_alt ?? "").trim();
  if (status === "published" && String(body.image_path ?? "").trim() && !imageAlt) {
    return NextResponse.json(
      { error: "Write a short description of the cover photo before the event can go on the website." },
      { status: 400 }
    );
  }
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
    image_alt: imageAlt || null,
    body_html: body.body_html ? sanitizeRichHtml(body.body_html) : null,
    status,
    go_live_on: body.go_live_on ? String(body.go_live_on).slice(0, 10) : null,
    published_at: status === "published" ? new Date().toISOString() : null,
    updated_by: session.userId,
  };

  const { data, error: upErr } = await admin.from("event_items").upsert(row).select("id").single();
  if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
  await logActivity(session.userId, "events", "upsert", "event_item", data?.id ?? slug);
  return NextResponse.json({ ok: true, id: data?.id });
}

export async function DELETE(req: NextRequest) {
  const { error, session } = await requireStaff("events", "delete");
  if (error || !session) return error;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Nothing was selected." }, { status: 400 });

  const admin = createAdminClient();
  const { error: delErr } = await softDelete(admin, "event_items", id);
  if (delErr) return NextResponse.json({ error: dbError(delErr) }, { status: 500 });
  await logActivity(session.userId, "events", "delete", "event_item", id);
  return NextResponse.json({ ok: true });
}
