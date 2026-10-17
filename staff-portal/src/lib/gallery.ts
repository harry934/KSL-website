export type GalleryRow = {
  id: string;
  title: string | null;
  category: string | null;
  tags: string[] | null;
  storage_path: string | null;
  public_url: string | null;
  sort_order: number;
  status: string;
};

export type GalleryVideoRow = {
  id: string;
  youtube_id: string;
  title: string;
  caption: string | null;
  featured: boolean;
  sort_order: number;
  status: string;
};

export const GALLERY_CATEGORIES = [
  { value: "all", label: "General", where: "Shown on the Gallery page in All only." },
  { value: "kisumu", label: "Kisumu", where: "Shown on the Gallery page under Kisumu, and also in All." },
  { value: "mombasa", label: "Mombasa", where: "Shown on the Gallery page under Mombasa, and also in All." },
  { value: "krc", label: "Kenya Railways", where: "Shown on the Gallery page under Kenya Railways, and also in All." },
];

export function galleryPlace(value: string | null | undefined) {
  return GALLERY_CATEGORIES.find((c) => c.value === (value || "all")) ?? GALLERY_CATEGORIES[0];
}

export function photoSrc(row: Pick<GalleryRow, "public_url" | "storage_path">) {
  return row.public_url || row.storage_path || "";
}

export function toPublicPhoto(row: GalleryRow) {
  return {
    src: photoSrc(row),
    title: row.title || "",
    category: row.category || "all",
    tags: row.tags || [],
  };
}

export function toPublicVideo(row: GalleryVideoRow) {
  return {
    youtubeId: row.youtube_id,
    title: row.title,
    caption: row.caption ?? "",
    ...(row.featured ? { featured: true } : {}),
  };
}

/** Accepts a full YouTube link (watch, share, shorts, embed) or a bare video ID. */
export function youtubeIdFrom(input: string) {
  const value = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value;
  const match = value.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}
