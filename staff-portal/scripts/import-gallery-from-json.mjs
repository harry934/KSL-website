import { readFileSync } from "node:fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createDatabaseAdmin } from "./database.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const admin = createDatabaseAdmin();

const data = JSON.parse(readFileSync(resolve(__dirname, "../../data/gallery.json"), "utf8"));

const { data: existingPhotos, error: photosErr } = await admin.from("gallery_photos").select("storage_path, public_url");
if (photosErr) throw photosErr;
const known = new Set(existingPhotos.flatMap((p) => [p.storage_path, p.public_url]).filter(Boolean));

const photoRows = (data.photos ?? [])
  .filter((p) => p.src && !known.has(p.src))
  .map((p, i) => ({
    title: p.title ?? "",
    category: p.category || "all",
    tags: p.tags ?? [],
    storage_path: p.src,
    public_url: null,
    sort_order: existingPhotos.length + i,
    status: "published",
  }));
if (photoRows.length) {
  const { error } = await admin.from("gallery_photos").insert(photoRows);
  if (error) throw error;
}

const { data: existingVideos, error: videosErr } = await admin.from("gallery_videos").select("youtube_id");
if (videosErr) throw videosErr;
const knownVideos = new Set(existingVideos.map((v) => v.youtube_id));

const videoRows = (data.videos ?? [])
  .filter((v) => v.youtubeId && !knownVideos.has(v.youtubeId))
  .map((v, i) => ({
    youtube_id: v.youtubeId,
    title: v.title ?? "",
    caption: v.caption ?? null,
    featured: Boolean(v.featured),
    sort_order: existingVideos.length + i,
    status: "published",
  }));
if (videoRows.length) {
  const { error } = await admin.from("gallery_videos").insert(videoRows);
  if (error) throw error;
}

console.log(`Gallery import complete (${photoRows.length} photos, ${videoRows.length} videos added)`);
