import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, logActivity, publishGuard } from "@/lib/api-auth";
import { youtubeIdFrom } from "@/lib/gallery";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireStaff("gallery", "view");
  if (error) return error;

  const admin = createAdminClient();
  const [photosRes, videosRes] = await Promise.all([
    admin.from("gallery_photos").select("*").order("sort_order"),
    admin.from("gallery_videos").select("*").order("sort_order"),
  ]);

  if (photosRes.error || videosRes.error) {
    return NextResponse.json({ error: "Could not load the gallery." }, { status: 500 });
  }
  return NextResponse.json({ photos: photosRes.data ?? [], videos: videosRes.data ?? [] });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireStaff("gallery", "edit");
  if (error || !session) return error;

  const body = await req.json();
  const status = body.status ?? "published";
  const denied = publishGuard(session, "gallery", status);
  if (denied) return denied;
  const admin = createAdminClient();

  if (body.type === "video") {
    const youtubeId = youtubeIdFrom(String(body.youtube_id ?? ""));
    if (!youtubeId) {
      return NextResponse.json({ error: "That does not look like a YouTube link." }, { status: 400 });
    }
    const row = {
      ...(body.id ? { id: body.id } : {}),
      youtube_id: youtubeId,
      title: String(body.title ?? "").trim(),
      caption: body.caption ? String(body.caption).trim() : null,
      featured: Boolean(body.featured),
      sort_order: Number(body.sort_order) || 0,
      status,
      updated_by: session.userId,
    };
    if (row.featured) {
      await admin.from("gallery_videos").update({ featured: false }).neq("youtube_id", youtubeId);
    }
    const { data, error: upErr } = await admin.from("gallery_videos").upsert(row).select("id").single();
    if (upErr) return NextResponse.json({ error: "Could not save the video." }, { status: 500 });
    await logActivity(session.userId, "gallery", "upsert", "gallery_video", data.id);
    return NextResponse.json({ ok: true, id: data.id });
  }

  const title = String(body.title ?? "").trim();
  const alt = String(body.alt_text ?? "").trim() || title;
  if (status === "published" && !alt) {
    return NextResponse.json(
      { error: "Write what the photo shows before it can go on the website." },
      { status: 400 }
    );
  }

  const row = {
    ...(body.id ? { id: body.id } : {}),
    title,
    alt_text: alt || null,
    category: body.category ?? "all",
    tags: body.tags ?? [],
    storage_path: body.storage_path ?? null,
    public_url: body.public_url ?? null,
    sort_order: Number(body.sort_order) || 0,
    status,
    updated_by: session.userId,
  };

  const { data, error: upErr } = await admin.from("gallery_photos").upsert(row).select("id").single();
  if (upErr) return NextResponse.json({ error: "Could not save the photo." }, { status: 500 });
  await logActivity(session.userId, "gallery", "upsert", "gallery_photo", data.id);
  return NextResponse.json({ ok: true, id: data.id });
}

export async function DELETE(req: NextRequest) {
  const { error, session } = await requireStaff("gallery", "delete");
  if (error || !session) return error;

  const params = new URL(req.url).searchParams;
  const id = params.get("id");
  const isVideo = params.get("type") === "video";
  if (!id) return NextResponse.json({ error: "Nothing selected." }, { status: 400 });

  const admin = createAdminClient();
  const table = isVideo ? "gallery_videos" : "gallery_photos";
  const { error: delErr } = await admin.from(table).delete().eq("id", id);
  if (delErr) return NextResponse.json({ error: "Could not remove it." }, { status: 500 });
  await logActivity(session.userId, "gallery", "delete", isVideo ? "gallery_video" : "gallery_photo", id);
  return NextResponse.json({ ok: true });
}
