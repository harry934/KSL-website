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

export function toPublicPhoto(row: GalleryRow) {
  return {
    src: row.public_url || row.storage_path || "",
    title: row.title || "",
    category: row.category || "all",
    tags: row.tags || [],
  };
}
