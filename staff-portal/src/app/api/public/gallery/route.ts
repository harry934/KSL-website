import { createAdminClient } from "@/lib/supabase/admin";
import { toPublicPhoto, toPublicVideo } from "@/lib/gallery";
import { kept } from "@/lib/recycle";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = createAdminClient();
  const [photosRes, videosRes] = await Promise.all([
    admin.from("gallery_photos").select("*").eq("status", "published").order("sort_order"),
    admin.from("gallery_videos").select("*").eq("status", "published").order("sort_order"),
  ]);

  if (photosRes.error || videosRes.error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });

  const photos = kept(photosRes.data);
  const videos = kept(videosRes.data);
  return NextResponse.json(
    { photos: photos.map(toPublicPhoto), videos: videos.map(toPublicVideo) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
