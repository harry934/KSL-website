import { createAdminClient } from "@/lib/supabase/admin";
import { canAccess, type ModuleKey } from "@/lib/modules";
import type { StaffSession } from "@/lib/session";
import { addDays, formatDay, nairobiToday } from "@/lib/dates";
import type { NotificationIcon, NotificationTone } from "@/components/ui/notification-center";

export type WatchNotice = {
  id: string;
  href: string;
  title: string;
  detail: string;
  source: "Closing soon" | "Scheduled" | "Needs a look";
  icon: NotificationIcon;
  tone: NotificationTone;
  module: ModuleKey;
  day: string;
};

type FlagRow = {
  id?: string;
  title?: string;
  status?: string;
  published_date?: string | null;
  event_date?: string | null;
  go_live_on?: string | null;
  closing_date?: string | null;
  expires_on?: string | null;
  deleted_at?: string | null;
  featured?: boolean;
  updated_at?: string | null;
};

async function rows(admin: ReturnType<typeof createAdminClient>, table: string, columns: string) {
  const { data, error } = await admin.from(table).select(columns);
  if (error || !data) return [] as FlagRow[];
  return data as FlagRow[];
}

/** Items that are ending, waiting to appear, or still unpublished. */
export async function loadWatchNotices(session: StaffSession): Promise<WatchNotice[]> {
  const admin = createAdminClient();
  const today = nairobiToday();
  const until = addDays(today, 14);
  const from = addDays(today, -7);
  const staleDraft = addDays(today, -30);
  const staleFeatured = addDays(today, -90);
  const notices: WatchNotice[] = [];

  const push = (item: WatchNotice) => notices.push(item);

  if (canAccess(session.permissions, "careers", "view", session.isSuperAdmin)) {
    for (const row of await rows(admin, "career_listings", "id, title, closing_date, status, deleted_at")) {
      if (row.deleted_at || row.status !== "published" || !row.id) continue;
      const day = String(row.closing_date ?? "").slice(0, 10);
      if (!day || day < from || day > until) continue;
      const past = day < today;
      push({
        id: `watch:career:${row.id}:${day}`,
        href: `/careers?edit=${row.id}`,
        title: row.title || "Job",
        detail: past ? `The closing date was ${formatDay(day)}, and the job is still on the website.` : `Closes ${formatDay(day)}.`,
        source: "Closing soon",
        icon: "closing",
        tone: past ? "danger" : "warning",
        module: "careers",
        day,
      });
    }
  }

  if (canAccess(session.permissions, "downloads", "view", session.isSuperAdmin)) {
    for (const row of await rows(admin, "download_items", "id, title, status, expires_on, deleted_at")) {
      if (row.deleted_at || row.status !== "published" || !row.id) continue;
      const day = String(row.expires_on ?? "").slice(0, 10);
      if (!day || day < from || day > until) continue;
      const past = day < today;
      push({
        id: `watch:download:${row.id}:${day}`,
        href: `/downloads?edit=${row.id}`,
        title: row.title || "Document",
        detail: past ? `The document expired on ${formatDay(day)}.` : `Leaves the website on ${formatDay(day)}.`,
        source: "Closing soon",
        icon: "closing",
        tone: past ? "danger" : "warning",
        module: "downloads",
        day,
      });
    }
  }

  if (canAccess(session.permissions, "site_settings", "view", session.isSuperAdmin)) {
    const { data } = await admin.from("site_settings").select("value").eq("key", "announcement").maybeSingle();
    const value = (data?.value ?? null) as {
      enabled?: boolean;
      endsOn?: string;
      label?: string;
      text?: string;
      queue?: { enabled?: boolean; endsOn?: string; label?: string; text?: string }[];
    } | null;
    const banners = value?.queue?.length ? value.queue : value ? [value] : [];
    banners.forEach((item, index) => {
      if (item.enabled === false) return;
      const ends = String(item.endsOn ?? "").slice(0, 10);
      if (!ends || ends < from || ends > until) return;
      const past = ends < today;
      const title = item.label?.trim() || item.text?.trim() || "Website banner";
      push({
        id: `watch:banner:${index}:${ends}`,
        href: "/banner",
        title,
        detail: past ? `The banner ended on ${formatDay(ends)}.` : `The banner ends on ${formatDay(ends)}.`,
        source: "Closing soon",
        icon: "closing",
        tone: past ? "danger" : "warning",
        module: "site_settings",
        day: ends,
      });
    });
  }

  if (canAccess(session.permissions, "news", "view", session.isSuperAdmin)) {
    for (const row of await rows(admin, "news_items", "id, title, status, published_date, go_live_on, deleted_at")) {
      if (row.deleted_at || !row.id) continue;
      const live = String(row.go_live_on ?? "").slice(0, 10);
      if (row.status === "published" && live > today) {
        push({
          id: `watch:news-live:${row.id}`,
          href: `/news?edit=${row.id}`,
          title: row.title || "Story",
          detail: `Appears ${formatDay(live)}.`,
          source: "Scheduled",
          icon: "scheduled",
          tone: "info",
          module: "news",
          day: live,
        });
      }
      const written = String(row.published_date ?? "").slice(0, 10);
      if (row.status === "draft" && written && written < staleDraft) {
        push({
          id: `watch:news-draft:${row.id}`,
          href: `/news?edit=${row.id}`,
          title: row.title || "Story",
          detail: `Still unpublished. The date on it is ${formatDay(written)}.`,
          source: "Needs a look",
          icon: "attention",
          tone: "warning",
          module: "news",
          day: written,
        });
      }
    }
  }

  if (canAccess(session.permissions, "events", "view", session.isSuperAdmin)) {
    for (const row of await rows(admin, "event_items", "id, title, status, event_date, go_live_on, deleted_at")) {
      if (row.deleted_at || !row.id) continue;
      const live = String(row.go_live_on ?? "").slice(0, 10);
      if (row.status === "published" && live > today) {
        push({
          id: `watch:event-live:${row.id}`,
          href: `/events?edit=${row.id}`,
          title: row.title || "Event",
          detail: `Appears ${formatDay(live)}.`,
          source: "Scheduled",
          icon: "scheduled",
          tone: "info",
          module: "events",
          day: live,
        });
      }
      const when = String(row.event_date ?? "").slice(0, 10);
      if (row.status === "draft" && when && when < today) {
        push({
          id: `watch:event-past:${row.id}`,
          href: `/events?edit=${row.id}`,
          title: row.title || "Event",
          detail: `The date was ${formatDay(when)}, and it is still unpublished.`,
          source: "Needs a look",
          icon: "attention",
          tone: "warning",
          module: "events",
          day: when,
        });
      }
    }
  }

  if (canAccess(session.permissions, "gallery", "view", session.isSuperAdmin)) {
    for (const row of await rows(admin, "gallery_videos", "id, title, featured, status, updated_at, deleted_at")) {
      if (row.deleted_at || !row.featured || row.status !== "published" || !row.id) continue;
      const touched = String(row.updated_at ?? "").slice(0, 10);
      if (!touched || touched > staleFeatured) continue;
      push({
        id: `watch:gallery:${row.id}`,
        href: "/gallery",
        title: row.title || "Featured video",
        detail: `Still featured. It was last changed on ${formatDay(touched)}.`,
        source: "Needs a look",
        icon: "attention",
        tone: "warning",
        module: "gallery",
        day: touched,
      });
    }
  }

  return notices;
}
