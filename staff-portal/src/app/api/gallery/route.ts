import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, logActivity, publishGuard } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireStaff("gallery", "view");
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from("gallery_photos")
    .select("*")
    .order("sort_order");

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json({ photos: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireStaff("gallery", "edit");
  if (error || !session) return error;

  const body = await req.json();
  const denied = publishGuard(session, "gallery", body.status ?? "published");
  if (denied) return denied;
  const admin = createAdminClient();
  const row = {
    id: body.id,
    title: body.title ?? "",
    category: body.category ?? "all",
    tags: body.tags ?? [],
    storage_path: body.storage_path ?? null,
    public_url: body.public_url ?? null,
    sort_order: body.sort_order ?? 0,
    status: body.status ?? "published",
    updated_by: session.userId,
  };

  const { error: upErr } = await admin.from("gallery_photos").upsert(row);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  await logActivity(session.userId, "gallery", "upsert", "gallery_photo", row.id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { error, session } = await requireStaff("gallery", "delete");
  if (error || !session) return error;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = createAdminClient();
  const { error: delErr } = await admin.from("gallery_photos").delete().eq("id", id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  await logActivity(session.userId, "gallery", "delete", "gallery_photo", id);
  return NextResponse.json({ ok: true });
}
