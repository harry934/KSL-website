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

/** Normalize pg date / Date / ISO strings to YYYY-MM-DD for safe compares. */
export function calendarDay(value: unknown): string {
  if (value == null || value === "") return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    // Postgres `date` arrives as UTC midnight; keep the calendar day.
    return value.toISOString().slice(0, 10);
  }
  const text = String(value).trim();
  const iso = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return "";
}

export function toPublicEvent(row: EventRow) {
  const date = calendarDay(row.event_date);
  const item: Record<string, string | undefined> = {
    slug: row.slug,
    title: row.title,
    date,
    timezone: row.timezone ?? "Africa/Nairobi",
  };
  if (row.theme) item.theme = row.theme;
  if (row.time_start) item.timeStart = String(row.time_start).slice(0, 5);
  if (row.time_end) item.timeEnd = String(row.time_end).slice(0, 5);
  if (row.venue) item.venue = row.venue;
  if (row.description) item.description = row.description;
  if (row.summary) item.summary = row.summary;
  if (row.image_path) item.image = row.image_path;
  if (row.image_alt) item.imageAlt = row.image_alt;
  if (row.body_html) item.body = sanitizeRichHtml(row.body_html);
  return item;
}

export function isEventLive(row: EventRow, todayIso: string) {
  if (row.deleted_at) return false;
  if (row.status !== "published") return false;
  const goLive = calendarDay(row.go_live_on);
  if (goLive && goLive > todayIso) return false;
  return Boolean(calendarDay(row.event_date));
}

export function splitEventsByDate(rows: EventRow[], todayIso: string) {
  const upcoming: ReturnType<typeof toPublicEvent>[] = [];
  const past: ReturnType<typeof toPublicEvent>[] = [];
  for (const row of rows) {
    if (!isEventLive(row, todayIso)) continue;
    const pub = toPublicEvent(row);
    if (!pub.date) continue;
    if (pub.date >= todayIso) upcoming.push(pub);
    else past.push(pub);
  }
  upcoming.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  past.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return { upcoming, past };
}
