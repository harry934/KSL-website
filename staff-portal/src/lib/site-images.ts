import manifest from "@/lib/site-image-manifest.json";
import { parseHeroCrop, parseHeroTrim, type HeroCrop, type HeroTrim } from "@/lib/hero-frame";
import { safeLink } from "@/lib/safe-link";
import { isImagePath, isVideoPath, safeImageUrl } from "@/lib/site-image-url";

export type { HeroCrop, HeroTrim };
export { isImagePath, isVideoPath, safeImageUrl } from "@/lib/site-image-url";

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

export const HOME_HERO_SLOT = "chrome.home-hero";
export const HERO_MEDIA_LIMIT = 8;

export type HeroMediaItem = {
  kind: "image" | "video";
  public_url: string;
  storage_path: string | null;
  crop: HeroCrop | null;
  trim: HeroTrim | null;
  title: string;
  subtitle: string;
  buttonLabel: string;
  buttonUrl: string;
};

const DEFAULT_HERO_TITLE = "Catalyzing Shipbuilding Industry";
const DEFAULT_HERO_SUBTITLE = "From Mombasa and Kisumu, we build and refit the vessels that keep Eastern Africa moving.";
const DEFAULT_HERO_BUTTON_LABEL = "Read our story";
const DEFAULT_HERO_BUTTON_URL = "about.html";

function cleanHeroText(value: unknown, max: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function cleanHeroLink(value: unknown) {
  return safeLink(value, 240) ?? "";
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
    const record = row as {
      kind?: unknown;
      public_url?: unknown;
      publicUrl?: unknown;
      storage_path?: unknown;
      storagePath?: unknown;
      crop?: unknown;
      trim?: unknown;
      title?: unknown;
      subtitle?: unknown;
      buttonLabel?: unknown;
      button_label?: unknown;
      buttonUrl?: unknown;
      button_url?: unknown;
    };
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
      title: cleanHeroText(record.title, 90) || DEFAULT_HERO_TITLE,
      subtitle: cleanHeroText(record.subtitle, 220) || DEFAULT_HERO_SUBTITLE,
      buttonLabel: cleanHeroText(record.buttonLabel ?? record.button_label, 40) || DEFAULT_HERO_BUTTON_LABEL,
      buttonUrl: cleanHeroLink(record.buttonUrl ?? record.button_url) || DEFAULT_HERO_BUTTON_URL,
    });
    if (items.length >= HERO_MEDIA_LIMIT) break;
  }
  return items;
}
