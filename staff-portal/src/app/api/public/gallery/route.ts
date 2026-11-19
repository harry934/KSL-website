import { createDatabaseClient } from "@/lib/db-client";
import { toPublicPhoto, toPublicVideo } from "@/lib/gallery";
import { signPayload } from "@/lib/stored-file";
import { NextResponse } from "next/server";
import { PUBLIC_CMS_CACHE } from "@/lib/public-cache";

export const dynamic = "force-dynamic";

/** Published gallery photos and videos for the public site. */
export async function GET() {
  const admin = createDatabaseClient();
  const [photosRes, videosRes] = await Promise.all([
    admin
      .from("gallery_photos")
      .select("*")
      .eq("status", "published")
      .is("deleted_at", null)
      .order("sort_order", { ascending: true }),
    admin
      .from("gallery_videos")
      .select("*")
      .eq("status", "published")
      .is("deleted_at", null)
      .order("sort_order", { ascending: true }),
  ]);

  if (photosRes.error || videosRes.error) {
    return NextResponse.json({ error: "Unavailable" }, { status: 500 });
  }

  const photos = (photosRes.data ?? []).filter((row) => !row.deleted_at);
  const videos = (videosRes.data ?? []).filter((row) => !row.deleted_at);

  return NextResponse.json(
    await signPayload({
      photos: photos.map(toPublicPhoto),
      videos: videos.map(toPublicVideo),
    }),
    { headers: { "Cache-Control": PUBLIC_CMS_CACHE } }
  );
}
