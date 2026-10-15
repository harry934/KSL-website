import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
if (existsSync(envPath)) {
  const raw = readFileSync(envPath, "utf8").replace(/^\uFEFF/, "");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
}

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

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
