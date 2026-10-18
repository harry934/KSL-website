import manifest from "@/lib/site-image-manifest.json";

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

export function isImagePath(value: string) {
  return /\.(jpe?g|png|webp)(\?|#|$)/i.test(value);
}
