import manifest from "@/lib/site-image-manifest.json";
import { parseHeroCrop, parseHeroTrim, type HeroCrop, type HeroTrim } from "@/lib/hero-frame";

export type { HeroCrop, HeroTrim };

export type SiteImageSlot = {
  id: string;
  page: string;
  label: string;
  src: string;
  kind: "img" | "css" | "fallback";
  variable?: string;
};

export const SITE_IMAGE_SLOTS = manifest.slots as SiteImageSlot[];

const SLOT_IDS = new Set(SITE_IMAGE_SLOTS.map((slot) => slot.id));

export function isSiteImageSlot(id: string) {
  return SLOT_IDS.has(id);
}

export function safeImageUrl(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export const HOME_HERO_SLOT = "chrome.home-hero";
export const HERO_MEDIA_LIMIT = 8;

export type HeroMediaItem = {
  kind: "image" | "video";
  public_url: string;
  storage_path: string | null;
  crop: HeroCrop | null;
  trim: HeroTrim | null;
};

export function isImagePath(value: string) {
  return /\.(jpe?g|png|webp)(\?|#|$)/i.test(value);
}

export function isVideoPath(value: string) {
  return /\.(mp4|webm)(\?|#|$)/i.test(value);
}

function storagePathOf(value: unknown) {
  return typeof value === "string" && /^[\w./-]+$/.test(value) ? value : null;
}

/** Ordered home-hero photos and videos. Invalid rows are dropped. */
export function parseHeroMedia(value: unknown): HeroMediaItem[] {
  if (!Array.isArray(value)) return [];
  const items: HeroMediaItem[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const record = row as { kind?: unknown; public_url?: unknown; publicUrl?: unknown; storage_path?: unknown; storagePath?: unknown; crop?: unknown; trim?: unknown };
    const url = safeImageUrl(record.public_url ?? record.publicUrl);
    if (!url) continue;
    const kind = isVideoPath(url) ? "video" : isImagePath(url) ? "image" : null;
    if (!kind) continue;
    items.push({
      kind,
      public_url: url,
      storage_path: storagePathOf(record.storage_path ?? record.storagePath),
      crop: kind === "video" ? parseHeroCrop(record.crop) : null,
      trim: kind === "video" ? parseHeroTrim(record.trim) : null,
    });
    if (items.length >= HERO_MEDIA_LIMIT) break;
  }
  return items;
}
