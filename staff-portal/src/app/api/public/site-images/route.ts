import { createDatabaseClient } from "@/lib/db-client";
import { HOME_HERO_SLOT, isImagePath, parseHeroBundle, safeImageUrl } from "@/lib/site-images";
import { NextResponse } from "next/server";
import { signPayload } from "@/lib/stored-file";
import { PUBLIC_CMS_CACHE } from "@/lib/public-cache";

export async function GET() {
  const { data, error } = await createDatabaseClient()
    .from("site_image_overrides")
    .select("slot_id, public_url, media")
    .eq("source", "storage");
  if (error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });

  const images: Record<string, string> = {};
  let hero: {
    kind: "image" | "video";
    url: string;
    crop: { x: number; y: number; w: number; h: number } | null;
    trim: { start: number; end: number } | null;
    title: string;
    subtitle: string;
    buttonLabel: string;
    buttonUrl: string;
  }[] = [];
  let heroMode: "video_only" | "video_and_images" | "images_only" = "video_and_images";
  for (const row of data ?? []) {
    if (row.slot_id === HOME_HERO_SLOT) {
      const bundle = parseHeroBundle(row.media);
      heroMode = bundle.mode;
      const items = bundle.items.filter((item) => item.kind === "image");
      if (items.length) {
        hero = items.map((item) => ({
          kind: "image" as const,
          url: item.public_url,
          crop: null,
          trim: null,
          title: item.title,
          subtitle: item.subtitle,
          buttonLabel: item.buttonLabel,
          buttonUrl: item.buttonUrl,
        }));
        images[HOME_HERO_SLOT] = hero[0].url;
        continue;
      }
      // video_only (or empty slides) still publishes the chosen mode.
      continue;
    }
    const url = safeImageUrl(row.public_url);
    if (row.slot_id && url && isImagePath(url)) images[row.slot_id] = url;
  }

  return NextResponse.json(
    await signPayload({ images, hero, heroMode }),
    { headers: { "Cache-Control": PUBLIC_CMS_CACHE } }
  );
}
