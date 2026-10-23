import Link from "next/link";
import { Plus } from "lucide-react";
import { getStaffSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAccess, MODULE_ROUTES, type ModuleKey } from "@/lib/modules";
import { addDays, formatDay, nairobiToday } from "@/lib/dates";
import { formatBytes } from "@/lib/downloads";
import { IDLE_MS } from "@/lib/staff-session";
import { PageHeader } from "@/components/portal/page-header";
import { ServiceStatus } from "@/components/portal/service-status";
import { MODULE_ICONS } from "@/components/portal/module-icons";

const QUICK_ACTIONS: { module: ModuleKey; label: string }[] = [
  { module: "news", label: "Add a news story" },
  { module: "events", label: "Add an event" },
  { module: "gallery", label: "Upload photos" },
  { module: "careers", label: "Add a job opening" },
  { module: "downloads", label: "Add a document" },
];

type StatCard = { href: string; label: string; value: string; note: string };

function personName(row: { display_name?: string | null; username?: string | null } | null | undefined) {
  return row?.display_name || row?.username || "Staff";
}

async function usedBytes(admin: ReturnType<typeof createAdminClient>, bucket: string) {
  const { data, error } = await admin.schema("storage").from("objects").select("metadata").eq("bucket_id", bucket);
  if (error || !data) return null;
  return (data as { metadata?: { size?: number } | null }[]).reduce((sum, row) => {
    const size = Number(row.metadata?.size ?? 0);
    return sum + (Number.isFinite(size) ? size : 0);
  }, 0);
}

function bytesLabel(bytes: number) {
  return formatBytes(bytes) || "0 B";
}

async function dashboardCards(session: NonNullable<Awaited<ReturnType<typeof getStaffSession>>>) {
  const admin = createAdminClient();
  const cards: StatCard[] = [];

  if (session.isSuperAdmin) {
    const since = new Date(Date.now() - IDLE_MS).toISOString();
    const withBrowser = await admin
      .from("staff_sessions")
      .select("seen_at, client_label, admin_profiles(display_name, username)")
      .gte("seen_at", since);
    const live = withBrowser.error
      ? await admin.from("staff_sessions").select("seen_at, admin_profiles(display_name, username)").gte("seen_at", since)
      : withBrowser;
    const lines = ((live.data ?? []) as {
      client_label?: string | null;
      admin_profiles?: { display_name?: string | null; username?: string | null } | { display_name?: string | null; username?: string | null }[] | null;
    }[]).map((row) => {
      const profile = Array.isArray(row.admin_profiles) ? row.admin_profiles[0] : row.admin_profiles;
      const name = personName(profile);
      return row.client_label ? `${name}, ${row.client_label}` : name;
    });
    cards.push({
      href: "/staff",
      label: "Signed in now",
      value: live.error ? "—" : String(lines.length),
      note: live.error ? "Session records are not available yet." : lines.length ? lines.slice(0, 3).join(" · ") : "No open session.",
    });

    const { data: passwords, error: passwordError } = await admin
      .from("admin_profiles")
      .select("display_name, username")
      .eq("must_change_password", true)
      .eq("is_active", true);
    const waiting = (passwords ?? []).map((row) => personName(row));
    cards.push({
      href: "/staff",
      label: "One-time passwords",
      value: passwordError ? "—" : String(waiting.length),
      note: waiting.length ? waiting.slice(0, 3).join(", ") : "Every account has chosen a password.",
    });
  }

  if (canAccess(session.permissions, "messages", "view", session.isSuperAdmin)) {
    const { data, count, error } = await admin
      .from("website_messages")
      .select("first_name, surname, subject", { count: "exact" })
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(1);
    const newest = data?.[0];
    const who = newest ? [newest.first_name, newest.surname].filter(Boolean).join(" ") : "";
    cards.push({
      href: "/messages",
      label: "Unread messages",
      value: error ? "—" : String(count ?? 0),
      note: newest ? `${who || "Visitor"} · ${newest.subject || "No subject"}` : "Nothing waiting.",
    });
  }

  if (canAccess(session.permissions, "careers", "view", session.isSuperAdmin)) {
    const { data, error } = await admin.from("career_listings").select("closing_date").eq("status", "published");
    const open = data ?? [];
    const missing = open.filter((row) => !String(row.closing_date ?? "").trim()).length;
    cards.push({
      href: "/careers",
      label: "Jobs on the website",
      value: error ? "—" : String(open.length),
      note: missing ? `${missing} with no closing date.` : "Each open job has a closing date.",
    });
  }

  if (session.isSuperAdmin) {
    const photos = await usedBytes(admin, "media-public");
    const docs = await usedBytes(admin, "downloads");
    const total = photos == null && docs == null ? null : (photos ?? 0) + (docs ?? 0);
    cards.push({
      href: "/gallery",
      label: "Storage",
      value: total == null ? "—" : bytesLabel(total),
      note:
        total == null
          ? "Storage figures are not available."
          : `Photos ${bytesLabel(photos ?? 0)}, up to 50 MB each. Documents ${bytesLabel(docs ?? 0)}, up to 25 MB each.`,
    });
  }

  return cards;
}

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
  label?: string;
};

async function rows(admin: ReturnType<typeof createAdminClient>, table: string, columns: string) {
  const { data, error } = await admin.from(table).select(columns);
  if (error || !data) return [] as FlagRow[];
  return data as FlagRow[];
}

type DueItem = { href: string; title: string; detail: string };

async function watchLists(session: NonNullable<Awaited<ReturnType<typeof getStaffSession>>>) {
  const admin = createAdminClient();
  const today = nairobiToday();
  const until = addDays(today, 14);
  const from = addDays(today, -7);
  const staleDraft = addDays(today, -30);
  const staleFeatured = addDays(today, -90);
  const due: DueItem[] = [];
  const scheduled: DueItem[] = [];
  const attention: DueItem[] = [];

  if (canAccess(session.permissions, "careers", "view", session.isSuperAdmin)) {
    for (const row of await rows(admin, "career_listings", "id, title, closing_date, status")) {
      if (row.status !== "published") continue;
      const day = String(row.closing_date ?? "").slice(0, 10);
      if (!day || day < from || day > until) continue;
      due.push({
        href: `/careers?edit=${row.id}`,
        title: row.title || "Job",
        detail: day < today ? `The closing date was ${formatDay(day)}, and the job is still on the website.` : `Closes ${formatDay(day)}.`,
      });
    }
  }

  if (canAccess(session.permissions, "downloads", "view", session.isSuperAdmin)) {
    for (const row of await rows(admin, "download_items", "id, title, status, expires_on, deleted_at")) {
      if (row.deleted_at || row.status !== "published") continue;
      const day = String(row.expires_on ?? "").slice(0, 10);
      if (!day || day < from || day > until) continue;
      due.push({
        href: `/downloads?edit=${row.id}`,
        title: row.title || "Document",
        detail: day < today ? `The document expired on ${formatDay(day)}.` : `Leaves the website on ${formatDay(day)}.`,
      });
    }
  }

  if (canAccess(session.permissions, "site_settings", "view", session.isSuperAdmin)) {
    const { data } = await admin.from("site_settings").select("value").eq("key", "announcement").maybeSingle();
    const value = (data?.value ?? null) as { enabled?: boolean; endsOn?: string; label?: string } | null;
    const ends = String(value?.endsOn ?? "").slice(0, 10);
    if (value?.enabled && ends && ends >= from && ends <= until) {
      due.push({
        href: "/settings",
        title: value.label?.trim() || "Website banner",
        detail: ends < today ? `The banner ended on ${formatDay(ends)}.` : `The banner ends on ${formatDay(ends)}.`,
      });
    }
  }

  if (canAccess(session.permissions, "news", "view", session.isSuperAdmin)) {
    for (const row of await rows(admin, "news_items", "id, title, status, published_date, go_live_on, deleted_at")) {
      if (row.deleted_at) continue;
      const live = String(row.go_live_on ?? "").slice(0, 10);
      if (row.status === "published" && live > today) {
        scheduled.push({ href: `/news?edit=${row.id}`, title: row.title || "Story", detail: `Appears ${formatDay(live)}.` });
      }
      const written = String(row.published_date ?? "").slice(0, 10);
      if (row.status === "draft" && written && written < staleDraft) {
        attention.push({
          href: `/news?edit=${row.id}`,
          title: row.title || "Story",
          detail: `Still unpublished. The date on it is ${formatDay(written)}.`,
        });
      }
    }
  }

  if (canAccess(session.permissions, "events", "view", session.isSuperAdmin)) {
    for (const row of await rows(admin, "event_items", "id, title, status, event_date, go_live_on, deleted_at")) {
      if (row.deleted_at) continue;
      const live = String(row.go_live_on ?? "").slice(0, 10);
      if (row.status === "published" && live > today) {
        scheduled.push({ href: `/events?edit=${row.id}`, title: row.title || "Event", detail: `Appears ${formatDay(live)}.` });
      }
      const when = String(row.event_date ?? "").slice(0, 10);
      if (row.status === "draft" && when && when < today) {
        attention.push({
          href: `/events?edit=${row.id}`,
          title: row.title || "Event",
          detail: `The date was ${formatDay(when)}, and it is still unpublished.`,
        });
      }
    }
  }

  if (canAccess(session.permissions, "gallery", "view", session.isSuperAdmin)) {
    for (const row of await rows(admin, "gallery_videos", "id, title, featured, status, updated_at")) {
      if (!row.featured || row.status !== "published") continue;
      const touched = String(row.updated_at ?? "").slice(0, 10);
      if (!touched || touched > staleFeatured) continue;
      attention.push({
        href: "/gallery",
        title: row.title || "Featured video",
        detail: `Still featured. It was last changed on ${formatDay(touched)}.`,
      });
    }
  }

  return { due, scheduled, attention };
}

function WatchList({ title, items }: { title: string; items: DueItem[] }) {
  if (!items.length) return null;
  return (
    <section className="ksl-card">
      <div className="border-b border-[#eef1f4] px-5 py-4">
        <h2 className="text-[15px] font-bold text-[#0b1f3a]">{title}</h2>
      </div>
      <ul className="divide-y divide-[#eef1f4]">
        {items.map((item) => (
          <li key={item.href + item.title}>
            <Link href={item.href} className="block px-5 py-3 hover:bg-[#fafbfc]">
              <p className="text-[14px] font-semibold text-[#0b1f3a]">{item.title}</p>
              <p className="text-[13px] text-[#6b7785]">{item.detail}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function DashboardPage() {
  const session = await getStaffSession();
  if (!session) return null;

  const { due, scheduled, attention } = await watchLists(session);
  const stats = await dashboardCards(session);
  const quick = QUICK_ACTIONS.filter((action) => {
    if (session.isSuperAdmin) return true;
    return session.permissions.some((p) => p.module_key === action.module && p.can_edit);
  });

  return (
    <div className="flex flex-col gap-[18px]">
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${session.displayName}.`}
      />

      {quick.length > 0 && (
        <section>
          <h2 className="mb-2.5 text-[13px] font-semibold text-[#5b6775]">Quick actions</h2>
          <div className="flex flex-wrap gap-2">
            {quick.map((action) => {
              const Icon = MODULE_ICONS[action.module];
              return (
                <Link
                  key={action.module}
                  href={MODULE_ROUTES[action.module]}
                  className="group inline-flex items-center gap-2 rounded-[8px] border border-[#e3e8ee] bg-white px-3.5 py-2 text-[13.5px] font-semibold text-[#0b1f3a] shadow-[0_1px_2px_rgba(11,31,58,0.04)] transition hover:-translate-y-px hover:border-[#cfd8e2] hover:shadow-[0_8px_18px_rgba(11,31,58,0.08)]"
                >
                  <Icon className="h-4 w-4 text-[#5b6775] transition-colors group-hover:text-[#0b1f3a]" />
                  {action.label}
                  <Plus className="h-3.5 w-3.5 text-[#98a3b1]" />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {stats.length > 0 && (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Dashboard figures">
          {stats.map((card) => (
            <Link key={card.label} href={card.href} className="dash-stat">
              <p className="dash-stat-label">{card.label}</p>
              <p className="dash-stat-value">{card.value}</p>
              <p className="dash-stat-note">{card.note}</p>
            </Link>
          ))}
        </section>
      )}

      <WatchList title="Closing soon" items={due} />
      <WatchList title="Scheduled" items={scheduled} />
      <WatchList title="Needs a look" items={attention} />

      {session.isSuperAdmin && <ServiceStatus />}
    </div>
  );
}
