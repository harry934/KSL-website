import Link from "next/link";
import { Plus } from "lucide-react";
import { getStaffSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAccess, MODULE_ROUTES, type ModuleKey } from "@/lib/modules";
import { addDays, formatDay, nairobiToday } from "@/lib/dates";
import { formatBytes } from "@/lib/downloads";
import { DashboardRefresh } from "@/components/portal/dashboard-refresh";
import { PageHeader } from "@/components/portal/page-header";
import { MODULE_ICONS } from "@/components/portal/module-icons";

const QUICK_ACTIONS: { module: ModuleKey; label: string }[] = [
  { module: "news", label: "Add a news story" },
  { module: "events", label: "Add an event" },
  { module: "gallery", label: "Upload photos" },
  { module: "careers", label: "Add a job opening" },
  { module: "downloads", label: "Add a document" },
];

const STORAGE_QUOTA = 1024 * 1024 * 1024;
const DATABASE_QUOTA = 500 * 1024 * 1024;

const BUCKETS = [
  { id: "media-public", label: "Photos", tone: "photos" },
  { id: "downloads", label: "Documents", tone: "documents" },
  { id: "avatars", label: "Account photos", tone: "avatars" },
] as const;

function storageLabel(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const gb = bytes / STORAGE_QUOTA;
  if (gb >= 1) {
    const rounded = Math.round(gb * 10) / 10;
    return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)} GB`;
  }
  return formatBytes(bytes) || "0 B";
}

type StorageBucket = { bucket_id: string; bytes: number };

async function loadStorageUsage() {
  const { data, error } = await createAdminClient().rpc("storage_usage");
  if (error) return null;
  return ((data ?? []) as { bucket_id: string; bytes: number | string }[]).map((row) => ({
    bucket_id: row.bucket_id,
    bytes: Number(row.bytes) || 0,
  }));
}

function StorageMeter({ buckets }: { buckets: StorageBucket[] | null }) {
  if (!buckets) {
    return (
      <article className="storage-meter">
        <h2>Storage</h2>
        <p className="storage-wait">Run supabase/migrations/022_storage_usage.sql in Supabase to show used and free space.</p>
      </article>
    );
  }

  const slices = BUCKETS.map((bucket) => ({
    ...bucket,
    bytes: buckets.find((row) => row.bucket_id === bucket.id)?.bytes ?? 0,
  }));
  const other = buckets
    .filter((row) => !BUCKETS.some((bucket) => bucket.id === row.bucket_id))
    .reduce((sum, row) => sum + row.bytes, 0);
  const used = slices.reduce((sum, row) => sum + row.bytes, 0) + other;
  const free = Math.max(0, STORAGE_QUOTA - used);
  const scale = Math.max(used, STORAGE_QUOTA, 1);
  const width = (bytes: number) => `${(bytes / scale) * 100}%`;

  return (
    <article className="storage-meter" aria-label={`Storage, ${storageLabel(used)} used, ${storageLabel(free)} free of 1 GB`}>
      <div className="storage-head">
        <div>
          <h2>Storage</h2>
          <p>Supabase files, of the 1 GB allowance</p>
        </div>
        <p className="storage-figure">
          <strong>{storageLabel(used)}</strong>
          <span>used</span>
        </p>
      </div>
      <div className="storage-bar" aria-hidden>
        {slices.map((slice) =>
          slice.bytes > 0 ? <i key={slice.id} className={`is-${slice.tone}`} style={{ width: width(slice.bytes) }} /> : null
        )}
        {other > 0 ? <i className="is-other" style={{ width: width(other) }} /> : null}
      </div>
      <ul className="storage-legend">
        {slices.map((slice) => (
          <li key={slice.id}>
            <span className={`storage-swatch is-${slice.tone}`} />
            <span>{slice.label}</span>
            <strong>{storageLabel(slice.bytes)}</strong>
          </li>
        ))}
        {other > 0 ? (
          <li>
            <span className="storage-swatch is-other" />
            <span>Other</span>
            <strong>{storageLabel(other)}</strong>
          </li>
        ) : null}
        <li>
          <span className="storage-swatch is-free" />
          <span>Free</span>
          <strong>{storageLabel(free)}</strong>
        </li>
      </ul>
    </article>
  );
}

async function loadDatabaseSize() {
  const { data, error } = await createAdminClient().rpc("database_size_bytes");
  if (error || data == null) return null;
  const bytes = Number(data);
  return Number.isFinite(bytes) ? bytes : null;
}

function DatabaseMeter({ bytes }: { bytes: number | null }) {
  if (bytes == null) {
    return (
      <article className="storage-meter">
        <h2>Database</h2>
        <p className="storage-wait">Run supabase/migrations/023_database_size.sql in Supabase to show used and free space.</p>
      </article>
    );
  }

  const free = Math.max(0, DATABASE_QUOTA - bytes);
  const scale = Math.max(bytes, DATABASE_QUOTA, 1);

  return (
    <article className="storage-meter" aria-label={`Database, ${storageLabel(bytes)} used, ${storageLabel(free)} free of 500 MB`}>
      <div className="storage-head">
        <div>
          <h2>Database</h2>
          <p>Supabase database, of the 500 MB allowance</p>
        </div>
        <p className="storage-figure">
          <strong>{storageLabel(bytes)}</strong>
          <span>used</span>
        </p>
      </div>
      <div className="storage-bar" aria-hidden>
        {bytes > 0 ? <i className="is-database" style={{ width: `${(bytes / scale) * 100}%` }} /> : null}
      </div>
      <ul className="storage-legend">
        <li>
          <span className="storage-swatch is-database" />
          <span>Used</span>
          <strong>{storageLabel(bytes)}</strong>
        </li>
        <li>
          <span className="storage-swatch is-free" />
          <span>Free</span>
          <strong>{storageLabel(free)}</strong>
        </li>
      </ul>
    </article>
  );
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
    for (const row of await rows(admin, "career_listings", "id, title, closing_date, status, deleted_at")) {
      if (row.deleted_at || row.status !== "published") continue;
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
    const value = (data?.value ?? null) as {
      enabled?: boolean;
      endsOn?: string;
      label?: string;
      text?: string;
      queue?: { enabled?: boolean; endsOn?: string; label?: string; text?: string }[];
    } | null;
    const banners = value?.queue?.length ? value.queue : value ? [value] : [];
    for (const item of banners) {
      if (item.enabled === false) continue;
      const ends = String(item.endsOn ?? "").slice(0, 10);
      if (!ends || ends < from || ends > until) continue;
      due.push({
        href: "/banner",
        title: item.label?.trim() || item.text?.trim() || "Website banner",
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
    for (const row of await rows(admin, "gallery_videos", "id, title, featured, status, updated_at, deleted_at")) {
      if (row.deleted_at || !row.featured || row.status !== "published") continue;
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
  const storage = session.isSuperAdmin ? await loadStorageUsage() : null;
  const database = session.isSuperAdmin ? await loadDatabaseSize() : null;
  const quick = QUICK_ACTIONS.filter((action) => {
    if (session.isSuperAdmin) return true;
    return session.permissions.some((p) => p.module_key === action.module && p.can_edit);
  });

  return (
    <div className="flex flex-col gap-[18px]">
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${session.displayName}.`}
        actions={<DashboardRefresh />}
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

      <WatchList title="Closing soon" items={due} />
      <WatchList title="Scheduled" items={scheduled} />
      <WatchList title="Needs a look" items={attention} />

      {session.isSuperAdmin && (
        <section className="grid gap-3 lg:grid-cols-2" aria-label="Supabase usage">
          <StorageMeter buckets={storage} />
          <DatabaseMeter bytes={database} />
        </section>
      )}
    </div>
  );
}
