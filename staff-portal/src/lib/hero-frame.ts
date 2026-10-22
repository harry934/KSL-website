export type HeroCrop = { x: number; y: number; w: number; h: number };

function unit(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

/** Keeps a crop inside the film. A frame that is almost the whole picture is dropped. */
export function parseHeroCrop(value: unknown): HeroCrop | null {
  if (!value || typeof value !== "object") return null;
  const record = value as { x?: unknown; y?: unknown; w?: unknown; h?: unknown };
  const rawX = unit(record.x);
  const rawY = unit(record.y);
  const rawW = unit(record.w);
  const rawH = unit(record.h);
  if (rawX === null || rawY === null || rawW === null || rawH === null) return null;
  const x = Math.min(1, Math.max(0, rawX));
  const y = Math.min(1, Math.max(0, rawY));
  let w = Math.min(1, Math.max(0, rawW));
  let h = Math.min(1, Math.max(0, rawH));
  if (x + w > 1) w = 1 - x;
  if (y + h > 1) h = 1 - y;
  if (w < 0.08 || h < 0.08) return null;
  if (w > 0.98 && h > 0.98) return null;
  return { x, y, w, h };
}

/** Places a cropped film so the chosen frame covers the hero without stretching. */
export function heroFrameOffset(frameW: number, frameH: number, mediaW: number, mediaH: number, crop: HeroCrop) {
  const scale = Math.max(frameW / (crop.w * mediaW), frameH / (crop.h * mediaH));
  const width = mediaW * scale;
  const height = mediaH * scale;
  return {
    width,
    height,
    left: (frameW - crop.w * width) / 2 - crop.x * width,
    top: (frameH - crop.h * height) / 2 - crop.y * height,
  };
}
