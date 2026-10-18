import { sanitizeRichHtml } from "@/lib/sanitize-html";

export type NewsRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  published_date: string | null;
  image_path: string | null;
  author: string | null;
  location: string | null;
  body_html: string | null;
  status: string;
  published_at: string | null;
  go_live_on: string | null;
};

export function toPublicNewsItem(row: NewsRow) {
  const item: Record<string, string | undefined> = {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? undefined,
    category: row.category ?? "News",
    date: row.published_date ?? undefined,
    image: row.image_path ?? undefined,
    author: row.author ?? undefined,
    location: row.location ?? undefined,
  };
  if (row.body_html) item.body = sanitizeRichHtml(row.body_html);
  return item;
}

export function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
