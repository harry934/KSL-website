import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, logActivity, publishGuard, dbError } from "@/lib/api-auth";
import { isImagePath, isSiteImageSlot, safeImageUrl, SITE_IMAGE_SLOTS } from "@/lib/site-images";
import { siteAssetUrl } from "@/lib/site-url";
import { NextRequest, NextResponse } from "next/server";

async function storedImages() {
  const admin = createAdminClient();
  const found = new Map<string, { url: string; storagePath: string | null; label: string }>();

  function add(url: string | null | undefined, storagePath: string | null, label: string) {
    const safe = safeImageUrl(url) || (url ? safeImageUrl(siteAssetUrl(url)) : null);
    if (!safe || !isImagePath(safe) || found.has(safe)) return;
    found.set(safe, { url: safe, storagePath, label: label || "Gallery photo" });
  }

  const { data: gallery } = await admin
    .from("gallery_photos")
    .select("title, public_url, storage_path, status")
    .neq("status", "archived")
    .order("sort_order");

  for (const row of gallery ?? []) {
    let url = row.public_url as string | null;
    if ((!url || !/^https?:/i.test(url)) && row.storage_path) {
      const { data: pub } = admin.storage.from("media-public").getPublicUrl(row.storage_path);
      url = pub.publicUrl;
    }
    add(url, row.storage_path, row.title || "Gallery photo");
  }

  for (const slot of SITE_IMAGE_SLOTS) {
    add(slot.src, null, slot.label);
  }

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
