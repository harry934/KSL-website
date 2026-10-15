import { slugify } from "@/lib/news";

export type ServiceRow = {
  id: string;
  slug: string;
  category: string | null;
  title: string;
  excerpt: string | null;
  detail: string | null;
  image_path: string | null;
  downloads: string[] | null;
  source_popup_id: string | null;
  sort_order: number;
  status: string;
};

export type ServicesSettings = {
  intro: string | null;
  download_catalog: Record<string, { title: string; href: string }>;
};

export { slugify };

export function toPublicServiceItem(row: ServiceRow) {
  const item: Record<string, unknown> = {
    slug: row.slug,
    title: row.title,
  };
  if (row.category) item.category = row.category;
  if (row.excerpt) item.excerpt = row.excerpt;
  if (row.detail) item.detail = row.detail;
  if (row.image_path) item.image = row.image_path;
  if (row.downloads?.length) item.downloads = row.downloads;
  if (row.source_popup_id) item.sourcePopupId = row.source_popup_id;
  return item;
}

export function toPublicServicesPayload(
  settings: ServicesSettings | null,
  items: ServiceRow[]
) {
  return {
    intro: settings?.intro ?? "",
    items: items
      .filter((r) => r.status === "published")
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(toPublicServiceItem),
    downloadCatalog: settings?.download_catalog ?? {},
  };
}
