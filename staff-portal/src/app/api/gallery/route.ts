import { createDatabaseClient } from "@/lib/db-client";
import { requireStaff, logActivity } from "@/lib/api-auth";
import { clearReviewDraft, editorSavePlan, overlayDrafts, saveBody } from "@/lib/draft-review";
import { youtubeIdFrom } from "@/lib/gallery";
import { applyBinDelete, restoreRow, splitRemoved } from "@/lib/recycle";
import { releaseUnusedValues, rememberFiles } from "@/lib/storage-files";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireStaff("gallery", "view");
  if (error) return error;

  const admin = createDatabaseClient();
  const [photosRes, videosRes] = await Promise.all([
    admin.from("gallery_photos").select("*").order("sort_order"),
    admin.from("gallery_videos").select("*").order("sort_order"),
  ]);

  if (photosRes.error || videosRes.error) {
    return NextResponse.json({ error: "Could not load the gallery." }, { status: 500 });
  }
  const photos = splitRemoved(photosRes.data ?? []);
  const videos = splitRemoved(videosRes.data ?? []);
  return NextResponse.json({
    photos: await overlayDrafts(admin, "gallery_photos", photos.items),
    videos: await overlayDrafts(admin, "gallery_videos", videos.items),
    removedPhotos: photos.removed,
    removedVideos: videos.removed,
  });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireStaff("gallery", "edit");
  if (error || !session) return error;

  const body = await req.json();
  const admin = createDatabaseClient();
  if (body.action === "restore") {
    const table = body.type === "video" ? "gallery_videos" : "gallery_photos";
    const { error: restoreErr } = await restoreRow(admin, table, String(body.id ?? ""));
    if (restoreErr) return NextResponse.json({ error: "Could not restore it." }, { status: 500 });
    await logActivity(session.userId, "gallery", "restore", table === "gallery_videos" ? "gallery_video" : "gallery_photo", String(body.id ?? ""));
    return NextResponse.json({ ok: true });
  }
  const plan = await editorSavePlan(admin, session, "gallery", body.type === "video" ? "gallery_videos" : "gallery_photos", {
    id: body.id,
    requestedStatus: body.status ?? "published",
    title: String(body.title || body.alt_text || (body.type === "video" ? "Untitled video" : "Untitled photo")),
    payload: body,
  });
  if (plan.held) return plan.held;
  const status = plan.status;

  if (body.type === "video") {
    const youtubeId = youtubeIdFrom(String(body.youtube_id ?? body.link ?? "")) || null;
    const storagePath =
      typeof body.storage_path === "string" && /^[\w./-]+$/.test(body.storage_path) ? body.storage_path : null;
    const publicUrl = typeof body.public_url === "string" ? String(body.public_url).trim() : "";
    const contentType =
      body.content_type === "video/webm" || body.content_type === "video/mp4" ? body.content_type : null;
    const fileVideo = Boolean(storagePath && publicUrl && !youtubeId);
    if (!youtubeId && !fileVideo) {
      return NextResponse.json(
        { error: "Add a YouTube link, or upload an MP4 or WebM video file." },
        { status: 400 }
      );
    }
    const title = String(body.title ?? "").trim();
    if (!title) return NextResponse.json({ error: "Give the video a title." }, { status: 400 });
    const row = {
      ...(body.id ? { id: body.id } : {}),
      youtube_id: fileVideo ? null : youtubeId,
      storage_path: fileVideo ? storagePath : null,
      public_url: fileVideo ? publicUrl : null,
      content_type: fileVideo ? contentType || (storagePath?.endsWith(".webm") ? "video/webm" : "video/mp4") : null,
      title,
      caption: body.caption ? String(body.caption).trim() : null,
      featured: Boolean(body.featured),
      sort_order: Number(body.sort_order) || 0,
      status,
      updated_by: session.userId,
    };
    const previous = await rememberFiles(admin, "gallery_videos", body.id, ["storage_path", "public_url"]);
    const { data, error: upErr } = await admin.from("gallery_videos").upsert(row).select("id").single();
    if (upErr || !data) return NextResponse.json({ error: "Could not save the video." }, { status: 500 });
    if (row.featured) {
      await admin.from("gallery_videos").update({ featured: false }).neq("id", data.id);
    }
    await releaseUnusedValues(admin, previous);
    await clearReviewDraft(admin, "gallery_videos", data.id);
    await logActivity(session.userId, "gallery", "upsert", "gallery_video", data.id);
    return NextResponse.json(saveBody(session, "gallery", { id: data.id }));
  }

  const title = String(body.title ?? "").trim();
  const alt = String(body.alt_text ?? "").trim() || title;

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

  const previous = await rememberFiles(admin, "gallery_photos", body.id, ["storage_path", "public_url"]);
  const { data, error: upErr } = await admin.from("gallery_photos").upsert(row).select("id").single();
  if (upErr || !data) return NextResponse.json({ error: "Could not save the photo." }, { status: 500 });
  await releaseUnusedValues(admin, previous);
  await clearReviewDraft(admin, "gallery_photos", data.id);
  await logActivity(session.userId, "gallery", "upsert", "gallery_photo", data.id);
  return NextResponse.json(saveBody(session, "gallery", { id: data.id }));
}

export async function DELETE(req: NextRequest) {
  const { error, session } = await requireStaff("gallery", "delete");
  if (error || !session) return error;

  const params = new URL(req.url).searchParams;
  const id = params.get("id");
  const isVideo = params.get("type") === "video";
  if (!id) return NextResponse.json({ error: "Nothing selected." }, { status: 400 });

  const permanent = params.get("permanent") === "1";
  const admin = createDatabaseClient();
  const table = isVideo ? "gallery_videos" : "gallery_photos";
  const { error: delErr } = await applyBinDelete(admin, table, id, permanent);
  if (delErr?.code === "bin") return NextResponse.json({ error: delErr.message }, { status: 400 });
  if (delErr) return NextResponse.json({ error: "Could not remove it." }, { status: 500 });
  await clearReviewDraft(admin, table, id);
  await logActivity(session.userId, "gallery", permanent ? "purge" : "delete", isVideo ? "gallery_video" : "gallery_photo", id);
  return NextResponse.json({ ok: true });
}
