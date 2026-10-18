import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, logActivity, publishGuard, dbError } from "@/lib/api-auth";
import { isImagePath, isSiteImageSlot, safeImageUrl, SITE_IMAGE_SLOTS } from "@/lib/site-images";
import { siteAssetUrl } from "@/lib/site-url";
import { NextRequest, NextResponse } from "next/server";

const FOLDERS = ["news", "gallery", "events", "services", "products", "downloads", "csr", "press", "careers", "organization", "site_settings"];

async function storedImages() {
  const admin = createAdminClient();
  const found = new Map<string, { url: string; storagePath: string | null; label: string }>();

  function add(url: string | null | undefined, storagePath: string | null, label: string) {
    const safe = safeImageUrl(url) || (url ? safeImageUrl(siteAssetUrl(url)) : null);
    if (!safe || !isImagePath(safe) || found.has(safe)) return;
    found.set(safe, { url: safe, storagePath, label: label || "Stored image" });
  }

  await Promise.all(
    FOLDERS.map(async (folder) => {
      const { data } = await admin.storage.from("media-public").list(folder, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
      for (const file of data ?? []) {
        if (!file.name || !isImagePath(file.name)) continue;
        const storagePath = `${folder}/${file.name}`;
        const { data: pub } = admin.storage.from("media-public").getPublicUrl(storagePath);
        add(pub.publicUrl, storagePath, file.name);
      }
    })
  );

  const [gallery, downloads, settings, overrides] = await Promise.all([
    admin.from("gallery_photos").select("public_url, storage_path, caption"),
    admin.from("download_items").select("title, file_name, external_href, source"),
    admin.from("downloads_settings").select("base_url").eq("id", "default").maybeSingle(),
    admin.from("site_image_overrides").select("public_url, storage_path").eq("source", "storage"),
  ]);
  const docsBase = (settings.data?.base_url || "docs/").replace(/\/?$/, "/");

  for (const row of gallery.data ?? []) add(row.public_url, row.storage_path, row.caption || "Gallery photo");
  for (const row of downloads.data ?? []) {
    if (row.source === "storage") add(row.external_href, null, row.title);
    else if (row.file_name && isImagePath(row.file_name)) add(siteAssetUrl(docsBase + row.file_name), null, row.title);
  }
  for (const row of overrides.data ?? []) add(row.public_url, row.storage_path, "Website image");

  return Array.from(found.values());
}

export async function GET() {
  const { error } = await requireStaff("site_settings", "view");
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: loadErr } = await admin.from("site_image_overrides").select("slot_id, source, public_url, storage_path");
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
  if (body.source !== "storage") {
    const { error: delErr } = await admin.from("site_image_overrides").delete().eq("slot_id", slotId);
    if (delErr) return NextResponse.json({ error: dbError(delErr) }, { status: 500 });
    await logActivity(session.userId, "site_settings", "update", "site_image", slotId);
    return NextResponse.json({ ok: true });
  }

  const publicUrl = safeImageUrl(body.publicUrl);
  if (!publicUrl || !isImagePath(publicUrl)) {
    return NextResponse.json({ error: "Choose an image file." }, { status: 400 });
  }
  const storagePath = typeof body.storagePath === "string" && /^[\w./-]+$/.test(body.storagePath) ? body.storagePath : null;

  const { error: upErr } = await admin.from("site_image_overrides").upsert({
    slot_id: slotId,
    source: "storage",
    public_url: publicUrl,
    storage_path: storagePath,
    updated_by: session.userId,
  });
  if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
  await logActivity(session.userId, "site_settings", "update", "site_image", slotId);
  return NextResponse.json({ ok: true });
}
