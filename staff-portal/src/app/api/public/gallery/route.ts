import { createAdminClient } from "@/lib/supabase/admin";
import { toPublicPhoto, toPublicVideo } from "@/lib/gallery";
import { NextResponse } from "next/server";

export async function GET() {
  const admin = createAdminClient();
  const [photosRes, videosRes] = await Promise.all([
    admin.from("gallery_photos").select("*").eq("status", "published").order("sort_order"),
    admin.from("gallery_videos").select("*").eq("status", "published").order("sort_order"),
  ]);

  if (photosRes.error || videosRes.error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });

  return NextResponse.json(
    { photos: (photosRes.data ?? []).map(toPublicPhoto), videos: (videosRes.data ?? []).map(toPublicVideo) },
    { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } }
  );
}
