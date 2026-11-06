import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, dbError } from "@/lib/api-auth";
import { photoSrc } from "@/lib/gallery";
import { kept } from "@/lib/recycle";
import { siteAssetUrl } from "@/lib/site-url";
import { NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireStaff("organization", "view");
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: loadErr } = await admin
    .from("gallery_photos")
    .select("title, public_url, storage_path, deleted_at")
    .eq("status", "published")
    .order("sort_order");
  if (loadErr) return NextResponse.json({ error: dbError(loadErr) }, { status: 500 });

  const photos = kept(data ?? [])
    .map((row) => {
      const src = photoSrc(row);
      return { src: /^https?:/i.test(src) ? src : siteAssetUrl(src), title: row.title || "Gallery photo" };
    })
    .filter((row) => /\.(jpe?g|png|webp)(\?|$)/i.test(row.src));

  return NextResponse.json({ photos });
}
