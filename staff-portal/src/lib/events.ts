import { slugify } from "@/lib/news";
import { sanitizeRichHtml } from "@/lib/sanitize-html";

export type EventRow = {
  id: string;
  slug: string;
  title: string;
  theme: string | null;
  event_date: string;
  time_start: string | null;
  time_end: string | null;
  timezone: string | null;
  venue: string | null;
  description: string | null;
  summary: string | null;
  image_path: string | null;
  image_alt: string | null;
  body_html: string | null;
  status: string;
  published_at: string | null;
  go_live_on: string | null;
  deleted_at?: string | null;
};

export { slugify };

export function toPublicEvent(row: EventRow) {
  const item: Record<string, string | undefined> = {
    slug: row.slug,
    title: row.title,
    date: row.event_date,
    timezone: row.timezone ?? "Africa/Nairobi",
  };
  if (row.theme) item.theme = row.theme;
  if (row.time_start) item.timeStart = row.time_start;
  if (row.time_end) item.timeEnd = row.time_end;
  if (row.venue) item.venue = row.venue;
  if (row.description) item.description = row.description;
  if (row.summary) item.summary = row.summary;
  if (row.image_path) item.image = row.image_path;
  if (row.image_alt) item.imageAlt = row.image_alt;
  if (row.body_html) item.body = sanitizeRichHtml(row.body_html);
  return item;
}

export function splitEventsByDate(rows: EventRow[], todayIso: string) {
  const published = rows.filter((r) => r.status === "published");
  const upcoming: ReturnType<typeof toPublicEvent>[] = [];
  const past: ReturnType<typeof toPublicEvent>[] = [];
  for (const row of published) {
    const pub = toPublicEvent(row);
    if (String(row.event_date) >= todayIso) upcoming.push(pub);
    else past.push(pub);
  }
  upcoming.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  past.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return { upcoming, past };
}
