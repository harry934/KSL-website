import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, logActivity, publishGuard, dbError } from "@/lib/api-auth";
import { HOME_HERO_SLOT, isImagePath, isSiteImageSlot, parseHeroMedia, safeImageUrl, SITE_IMAGE_SLOTS } from "@/lib/site-images";
import { siteAssetUrl } from "@/lib/site-url";
import { releaseUnusedValues, rememberFiles } from "@/lib/storage-files";
import { NextRequest, NextResponse } from "next/server";

function galleryFileUrl(
  admin: ReturnType<typeof createAdminClient>,
  publicUrl: string | null | undefined,
  storagePath: string | null | undefined
) {
  const published = (publicUrl || "").trim();
  if (/^https?:/i.test(published)) return published;
  const path = (storagePath || published).trim();
  if (!path) return "";
  if (/^https?:/i.test(path)) return path;
  if (path.startsWith("img/") || path.startsWith("/img/")) return siteAssetUrl(path);
  const { data } = admin.storage.from("media-public").getPublicUrl(path.replace(/^\/+/, ""));
  return data.publicUrl;
}

async function addGalleryPhoto(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  publicUrl: string,
  storagePath: string | null,
  title: unknown
) {
  const already = storagePath
    ? await admin.from("gallery_photos").select("id").eq("storage_path", storagePath).limit(1)
    : await admin.from("gallery_photos").select("id").eq("public_url", publicUrl).limit(1);
  if (already.error) return dbError(already.error);
  if (already.data?.length) return null;
  const { data: latest } = await admin.from("gallery_photos").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const name = String(title || "Photo").replace(/\.[a-z0-9]+$/i, "").slice(0, 120) || "Photo";
  const { error } = await admin.from("gallery_photos").insert({
    title: name,
    category: "all",
    storage_path: storagePath,
    public_url: publicUrl,
    sort_order: (latest?.sort_order ?? 0) + 1,
    status: "published",
    updated_by: userId,
  });
  return error ? dbError(error) : null;
}

async function storedImages() {
  const admin = createAdminClient();
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
    add(galleryFileUrl(admin, row.public_url, row.storage_path), row.storage_path, row.title || "Gallery photo");
  }

  return Array.from(found.values());
}

export async function GET() {
  const { error } = await requireStaff("site_settings", "view");
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: loadErr } = await admin.from("site_image_overrides").select("slot_id, source, public_url, storage_path, media");
  if (loadErr) return NextResponse.json({ error: dbError(loadErr) }, { status: 500 });

  const library = await storedImages();
  return NextResponse.json({
    slots: SITE_IMAGE_SLOTS,
    overrides: data ?? [],
    library,
  });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireStaff("site_settings", "edit");
  if (error || !session) return error;
  const denied = publishGuard(session, "site_settings", "published");
  if (denied) return denied;

  const body = await req.json();
  const slotId = String(body.slotId || "").trim();
  if (!isSiteImageSlot(slotId)) {
    return NextResponse.json({ error: "That photo is not on the website." }, { status: 400 });
  }

  const admin = createAdminClient();
  const previous = await rememberFiles(admin, "site_image_overrides", slotId, ["storage_path", "public_url", "media"], "slot_id");
  if (body.source !== "storage") {
    const { error: delErr } = await admin.from("site_image_overrides").delete().eq("slot_id", slotId);
    if (delErr) return NextResponse.json({ error: dbError(delErr) }, { status: 500 });
    await releaseUnusedValues(admin, previous);
    await logActivity(session.userId, "site_settings", "update", "site_image", slotId);
    return NextResponse.json({ ok: true });
  }

  if (slotId === HOME_HERO_SLOT && Array.isArray(body.items)) {
    const items = parseHeroMedia(body.items);
    if (!items.length && body.items.length > 0) {
      return NextResponse.json({ error: "Use a JPG, PNG, WebP, MP4, or WebM file." }, { status: 400 });
    }
    if (!items.length) {
      const { error: delErr } = await admin.from("site_image_overrides").delete().eq("slot_id", slotId);
      if (delErr) return NextResponse.json({ error: dbError(delErr) }, { status: 500 });
      await releaseUnusedValues(admin, previous);
      await logActivity(session.userId, "site_settings", "update", "site_image", slotId);
      return NextResponse.json({ ok: true });
    }

    const poster = items.find((item) => item.kind === "image") ?? null;
    const { error: upErr } = await admin.from("site_image_overrides").upsert({
      slot_id: slotId,
      source: "storage",
      public_url: poster?.public_url ?? null,
      storage_path: poster?.storage_path ?? items[0].storage_path,
      media: items,
      updated_by: session.userId,
    });
    if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
    await releaseUnusedValues(admin, previous);

    if (body.addToGallery) {
      const galleryUrl = safeImageUrl(body.publicUrl);
      const galleryPath = typeof body.storagePath === "string" && /^[\w./-]+$/.test(body.storagePath) ? body.storagePath : null;
      if (galleryUrl && isImagePath(galleryUrl)) {
        const galleryErr = await addGalleryPhoto(admin, session.userId, galleryUrl, galleryPath, body.title);
        if (galleryErr) return NextResponse.json({ error: galleryErr }, { status: 500 });
      }
    }

    await logActivity(session.userId, "site_settings", "update", "site_image", slotId);
    return NextResponse.json({ ok: true });
  }

  const publicUrl = safeImageUrl(body.publicUrl);
  if (!publicUrl || !isImagePath(publicUrl)) {
    return NextResponse.json({ error: "Choose an image file." }, { status: 400 });
  }
  const storagePath = typeof body.storagePath === "string" && /^[\w./-]+$/.test(body.storagePath) ? body.storagePath : null;

  if (body.addToGallery) {
    const galleryErr = await addGalleryPhoto(admin, session.userId, publicUrl, storagePath, body.title);
    if (galleryErr) return NextResponse.json({ error: galleryErr }, { status: 500 });
  }

  const { error: upErr } = await admin.from("site_image_overrides").upsert({
    slot_id: slotId,
    source: "storage",
    public_url: publicUrl,
    storage_path: storagePath,
    updated_by: session.userId,
  });
  if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
  await releaseUnusedValues(admin, previous);
  await logActivity(session.userId, "site_settings", "update", "site_image", slotId);
  return NextResponse.json({ ok: true });
}
