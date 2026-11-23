import { createDatabaseClient } from "@/lib/db-client";
import { requireStaff, logActivity, dbError } from "@/lib/api-auth";
import { clearReviewDraft, editorSavePlan, saveBody } from "@/lib/draft-review";
import { HOME_HERO_SLOT, isImagePath, isSiteImageSlot, parseHeroMedia, parseHeroMode, safeImageUrl, SITE_IMAGE_SLOTS } from "@/lib/site-images";
import { siteAssetUrl } from "@/lib/site-url";
import { signedStoredFileUrl, storedFileUrl } from "@/lib/storage";
import { storageObjectFrom } from "@/lib/storage-path";
import { registerUploadedImage } from "@/lib/gallery-register";
import { releaseUnusedValues, rememberFiles } from "@/lib/storage-files";
import { NextRequest, NextResponse } from "next/server";

function galleryFileUrl(
  publicUrl: string | null | undefined,
  storagePath: string | null | undefined
) {
  const path = (storagePath || publicUrl || "").trim();
  if (!path) return "";
  if (/^https?:/i.test(path)) {
    const object = storageObjectFrom(path);
    if (!object) return path;
    return object.bucket === "media-public"
      ? storedFileUrl(object.bucket, object.path)
      : signedStoredFileUrl(object.bucket, object.path);
  }
  if (path.startsWith("img/") || path.startsWith("/img/")) return siteAssetUrl(path);
  const object = storageObjectFrom(path.replace(/^\/+/, ""));
  if (!object) return "";
  return object.bucket === "media-public"
    ? storedFileUrl(object.bucket, object.path)
    : signedStoredFileUrl(object.bucket, object.path);
}

async function addGalleryPhoto(userId: string, storagePath: string | null, title: unknown) {
  if (!storagePath) return null;
  return registerUploadedImage(userId, storagePath, String(title || ""), { status: "published" });
}

async function storedImages() {
  const admin = createDatabaseClient();
  const found = new Map<string, { url: string; storagePath: string | null; label: string }>();

  function add(url: string | null | undefined, storagePath: string | null, label: string) {
    const safe = safeImageUrl(url);
    if (!safe || !isImagePath(safe) || found.has(safe)) return;
    found.set(safe, { url: safe, storagePath, label: label || "Gallery photo" });
  }

  const { data: gallery } = await admin
    .from("gallery_photos")
    .select("title, public_url, storage_path, status")
    .neq("status", "archived")
    .order("sort_order");

  for (const row of gallery ?? []) {
    add(galleryFileUrl(row.public_url, row.storage_path), row.storage_path, row.title || "Gallery photo");
  }

  return Array.from(found.values());
}

export async function GET() {
  const { error } = await requireStaff("site_settings", "view");
  if (error) return error;

  const admin = createDatabaseClient();
  const { data, error: loadErr } = await admin.from("site_image_overrides").select("slot_id, source, public_url, storage_path, media");
  if (loadErr) return NextResponse.json({ error: dbError(loadErr) }, { status: 500 });

  const library = await storedImages();
  const { data: drafts } = await admin
    .from("content_drafts")
    .select("entity_key, payload")
    .eq("entity_table", "site_image_overrides")
    .is("entity_id", null);
  let overrides = data ?? [];
  for (const draft of drafts ?? []) {
    const payload = (draft.payload ?? {}) as Record<string, unknown>;
    const slotId = String(draft.entity_key || payload.slotId || "");
    if (!slotId) continue;
    overrides = overrides.filter((row) => row.slot_id !== slotId);
    if (payload.source === "storage") {
      overrides.push({
        slot_id: slotId,
        source: "storage",
        public_url: typeof payload.publicUrl === "string" ? payload.publicUrl : typeof payload.public_url === "string" ? payload.public_url : null,
        storage_path: typeof payload.storagePath === "string" ? payload.storagePath : typeof payload.storage_path === "string" ? payload.storage_path : null,
        media: payload.items ?? payload.media ?? null,
      });
    }
  }
  return NextResponse.json({
    slots: SITE_IMAGE_SLOTS,
    overrides,
    library,
    pending: (drafts ?? []).length > 0,
  });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireStaff("site_settings", "edit");
  if (error || !session) return error;

  const body = await req.json();
  const slotId = String(body.slotId || "").trim();
  if (!isSiteImageSlot(slotId)) {
    return NextResponse.json({ error: "That photo is not on the website." }, { status: 400 });
  }

  const admin = createDatabaseClient();
  const plan = await editorSavePlan(admin, session, "site_settings", "site_image_overrides", {
    settings: true,
    key: slotId,
    title: "Website image",
    payload: body,
  });
  if (plan.held) return plan.held;
  const previous = await rememberFiles(admin, "site_image_overrides", slotId, ["storage_path", "public_url", "media"], "slot_id");
  if (body.source !== "storage") {
    const { error: delErr } = await admin.from("site_image_overrides").delete().eq("slot_id", slotId);
    if (delErr) return NextResponse.json({ error: dbError(delErr) }, { status: 500 });
    await releaseUnusedValues(admin, previous);
    await clearReviewDraft(admin, "site_image_overrides", null, slotId);
    await logActivity(session.userId, "site_settings", "update", "site_image", slotId);
    return NextResponse.json(saveBody(session, "site_settings"));
  }

  if (slotId === HOME_HERO_SLOT && Array.isArray(body.items)) {
    // Hero CMS slides are photos; mode is film only, film+photos carousel, or photos only.
    const items = parseHeroMedia(body.items).filter((item) => item.kind === "image");
    const mode = parseHeroMode(body.mode);
    if (!items.length && body.items.length > 0) {
      return NextResponse.json({ error: "Use a JPG, PNG, or WebP photo for hero slides." }, { status: 400 });
    }
    if (!items.length) {
      const { error: delErr } = await admin.from("site_image_overrides").delete().eq("slot_id", slotId);
      if (delErr) return NextResponse.json({ error: dbError(delErr) }, { status: 500 });
      await releaseUnusedValues(admin, previous);
      await clearReviewDraft(admin, "site_image_overrides", null, slotId);
      await logActivity(session.userId, "site_settings", "update", "site_image", slotId);
      return NextResponse.json(saveBody(session, "site_settings"));
    }

    const poster = items.find((item) => item.kind === "image") ?? null;
    const { error: upErr } = await admin.from("site_image_overrides").upsert(
      {
        slot_id: slotId,
        source: "storage",
        public_url: poster?.public_url ?? null,
        storage_path: poster?.storage_path ?? items[0].storage_path,
        media: { mode, items },
        updated_by: session.userId,
      },
      { onConflict: "slot_id" },
    );
    if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
    await releaseUnusedValues(admin, previous);

    if (body.addToGallery) {
      const galleryUrl = safeImageUrl(body.publicUrl);
      const galleryPath = typeof body.storagePath === "string" && /^[\w./-]+$/.test(body.storagePath) ? body.storagePath : null;
      if (galleryUrl && isImagePath(galleryUrl)) {
        const galleryErr = await addGalleryPhoto(session.userId, galleryPath, body.title);
        if (galleryErr) return NextResponse.json({ error: galleryErr }, { status: 500 });
      }
    }

    await clearReviewDraft(admin, "site_image_overrides", null, slotId);
    await logActivity(session.userId, "site_settings", "update", "site_image", slotId);
    return NextResponse.json(saveBody(session, "site_settings"));
  }

  const publicUrl = safeImageUrl(body.publicUrl);
  if (!publicUrl || !isImagePath(publicUrl)) {
    return NextResponse.json({ error: "Choose an image file." }, { status: 400 });
  }
  const storagePath = typeof body.storagePath === "string" && /^[\w./-]+$/.test(body.storagePath) ? body.storagePath : null;

  if (body.addToGallery) {
    const galleryErr = await addGalleryPhoto(session.userId, storagePath, body.title);
    if (galleryErr) return NextResponse.json({ error: galleryErr }, { status: 500 });
  }

  const { error: upErr } = await admin.from("site_image_overrides").upsert(
    {
      slot_id: slotId,
      source: "storage",
      public_url: publicUrl,
      storage_path: storagePath,
      updated_by: session.userId,
    },
    { onConflict: "slot_id" },
  );
  if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
  await releaseUnusedValues(admin, previous);
  await clearReviewDraft(admin, "site_image_overrides", null, slotId);
  await logActivity(session.userId, "site_settings", "update", "site_image", slotId);
  return NextResponse.json(saveBody(session, "site_settings"));
}
