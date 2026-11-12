import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { Plus } from "lucide-react";
import { getStaffSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { MODULE_ROUTES, type ModuleKey } from "@/lib/modules";
import { permissionNavLinks, usesSidebar } from "@/lib/portal-nav";
import { formatBytes } from "@/lib/downloads";
import { loadStorageBreakdown, type StorageBreakdown } from "@/lib/storage-files";
import { AccountRequestsPanel } from "@/components/portal/account-requests-panel";
import { DashboardRefresh } from "@/components/portal/dashboard-refresh";
import { ReturnedNotes } from "@/components/portal/drafts-page";
import { ShipyardMark } from "@/components/portal/shipyard-mark";
import { PageHeader } from "@/components/portal/page-header";
import { SectionCards } from "@/components/portal/section-cards";
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
  if (bytes >= STORAGE_QUOTA) {
    const gb = bytes / STORAGE_QUOTA;
    const rounded = Math.round(gb * 10) / 10;
    return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)} GB`;
  }
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return formatBytes(bytes) || "0 B";
}

async function loadStorageUsage(): Promise<StorageBreakdown | null> {
  noStore();
  const admin = createAdminClient();
  const breakdown = await loadStorageBreakdown(admin);
  if (breakdown) return breakdown;
  const { data, error } = await admin.rpc("storage_usage");
  if (error) return null;
  return {
    buckets: ((data ?? []) as { bucket_id: string; bytes: number | string }[]).map((row) => ({
      bucket_id: row.bucket_id,
      bytes: Number(row.bytes) || 0,
    })),
    bin: 0,
    spare: 0,
  };
}

function StorageMeter({ usage }: { usage: StorageBreakdown | null }) {
  if (!usage) {
    return (
      <article className="storage-meter">
        <h2>Storage</h2>
        <p className="storage-wait">Run supabase/migrations/022_storage_usage.sql in Supabase to show used and free space.</p>
      </article>
    );
  }

  const slices = BUCKETS.map((bucket) => ({
    ...bucket,
    bytes: usage.buckets.find((row) => row.bucket_id === bucket.id)?.bytes ?? 0,
  }));
  const other = usage.buckets
    .filter((row) => !BUCKETS.some((bucket) => bucket.id === row.bucket_id))
    .reduce((sum, row) => sum + row.bytes, 0);
  const used = slices.reduce((sum, row) => sum + row.bytes, 0) + other;
  const stored = used + usage.bin + usage.spare;
  const free = Math.max(0, STORAGE_QUOTA - stored);
  const scale = Math.max(stored, STORAGE_QUOTA, 1);
  const width = (bytes: number) => `${(bytes / scale) * 100}%`;
  const high = stored / STORAGE_QUOTA >= 0.8;

  return (
    <article className={high ? "storage-meter is-tight" : "storage-meter"} aria-label={`Storage, ${storageLabel(used)} in use, ${storageLabel(free)} free of 1 GB`}>
      <div className="storage-head">
        <div>
          <h2>Storage</h2>
          {high ? <p>More than 80% of the 1 GB allowance is in use.</p> : null}
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
        {usage.bin > 0 ? <i className="is-bin" style={{ width: width(usage.bin) }} /> : null}
        {usage.spare > 0 ? <i className="is-other" style={{ width: width(usage.spare) }} /> : null}
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
        {usage.bin > 0 ? (
          <li>
            <span className="storage-swatch is-bin" />
            <Link href="/recycle">Recycle bin</Link>
            <strong>{storageLabel(usage.bin)}</strong>
          </li>
        ) : null}
        {usage.spare > 0 ? (
          <li>
            <span className="storage-swatch is-other" />
            <Link href="/files">Not linked</Link>
            <strong>{storageLabel(usage.spare)}</strong>
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
  const high = bytes / DATABASE_QUOTA >= 0.8;

  return (
    <article className={high ? "storage-meter is-tight" : "storage-meter"} aria-label={`Database, ${storageLabel(bytes)} used, ${storageLabel(free)} free of 500 MB`}>
      <div className="storage-head">
        <div>
          <h2>Database</h2>
          <p>{high ? "More than 80% of the 500 MB allowance is in use." : "Supabase database, of the 500 MB allowance"}</p>
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

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getStaffSession();
  if (!session) return null;

  const [storage, database] = session.isSuperAdmin
    ? await Promise.all([loadStorageUsage(), loadDatabaseSize()])
    : [null, null];
  const cards = !usesSidebar(session);
  const sections = cards ? permissionNavLinks(session) : [];
  const quick = QUICK_ACTIONS.filter((action) => {
    if (session.isSuperAdmin) return true;
    return session.permissions.some((p) => p.module_key === action.module && p.can_edit);
  });

  return (
    <div className="dash-stage">
      <PageHeader
        title="Dashboard"
        description={
          cards && sections.length
            ? `Welcome back, ${session.displayName}. Open a section below.`
            : `Welcome back, ${session.displayName}.`
        }
        actions={<DashboardRefresh />}
      />

      {cards && <SectionCards links={sections} userId={session.userId} />}

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

      {session.isSuperAdmin && (
        <section className="grid gap-3 lg:grid-cols-2" aria-label="Supabase usage">
          <StorageMeter usage={storage} />
          <DatabaseMeter bytes={database} />
        </section>
      )}

      <ReturnedNotes />
      {session.isSuperAdmin ? <AccountRequestsPanel /> : null}
      <ShipyardMark />
    </div>
  );
}
