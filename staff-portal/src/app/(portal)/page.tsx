import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { Plus } from "lucide-react";
import { getStaffSession } from "@/lib/session";
import { createDatabaseClient } from "@/lib/db-client";
import { query } from "@/lib/db";
import { MODULE_ROUTES, type ModuleKey } from "@/lib/modules";
import { permissionNavLinks, usesSidebar } from "@/lib/portal-nav";
import { formatBytes } from "@/lib/downloads";
import { loadStorageBreakdown, type StorageBreakdown } from "@/lib/storage-files";
import { storageDiskCapacity } from "@/lib/storage";
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

const GIBIBYTE = 1024 * 1024 * 1024;
/** Soft guide for the Postgres meter when disk stats are unavailable. */
const DATABASE_GUIDE = 2 * GIBIBYTE;

const BUCKETS = [
  { id: "media-public", label: "Photos", tone: "photos" },
  { id: "downloads", label: "Documents", tone: "documents" },
  { id: "avatars", label: "Account photos", tone: "avatars" },
] as const;

function storageLabel(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes >= GIBIBYTE) {
    const gb = bytes / GIBIBYTE;
    const rounded = Math.round(gb * 10) / 10;
    return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)} GB`;
  }
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return formatBytes(bytes) || "0 B";
}

async function loadStorageUsage(): Promise<StorageBreakdown | null> {
  noStore();
  const admin = createDatabaseClient();
  return loadStorageBreakdown(admin);
}

function StorageMeter({
  usage,
  disk,
}: {
  usage: StorageBreakdown | null;
  disk: { total: number; free: number } | null;
}) {
  if (!usage) {
    return (
      <article className="storage-meter">
        <h2>Storage</h2>
        <p className="storage-wait">Stored-file usage is currently unavailable.</p>
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
  const total = disk?.total && disk.total > 0 ? disk.total : Math.max(stored, 1);
  const free = disk ? Math.max(0, disk.free) : Math.max(0, total - stored);
  const scale = Math.max(total, stored, 1);
  const width = (bytes: number) => `${Math.max((bytes / scale) * 100, bytes > 0 ? 0.4 : 0)}%`;
  const high = disk ? stored / total >= 0.8 : false;

  return (
    <article
      className={high ? "storage-meter is-tight" : "storage-meter"}
      aria-label={`Storage, ${storageLabel(stored)} used, ${storageLabel(free)} free of ${storageLabel(total)}`}
    >
      <div className="storage-head">
        <div>
          <h2>Storage</h2>
          <p>
            {disk
              ? high
                ? "More than 80% of the VPS disk for uploads is in use."
                : `${storageLabel(stored)} used · ${storageLabel(free)} free of ${storageLabel(total)}`
              : "Uploads use the VPS filesystem."}
          </p>
        </div>
        <p className="storage-figure">
          <strong>{storageLabel(stored)}</strong>
          <span>of {storageLabel(total)}</span>
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
  try {
    const result = await query<{ bytes: string }>("SELECT pg_database_size(current_database())::text AS bytes");
    const bytes = Number(result.rows[0]?.bytes);
    return Number.isFinite(bytes) ? bytes : null;
  } catch {
    return null;
  }
}

function DatabaseMeter({
  bytes,
  disk,
}: {
  bytes: number | null;
  disk: { total: number; free: number } | null;
}) {
  if (bytes == null) {
    return (
      <article className="storage-meter">
        <h2>Database</h2>
        <p className="storage-wait">PostgreSQL database size is currently unavailable.</p>
      </article>
    );
  }

  const total = disk?.total && disk.total > 0 ? disk.total : DATABASE_GUIDE;
  const free = disk ? Math.max(0, disk.free) : Math.max(0, total - bytes);
  const scale = Math.max(total, bytes, 1);
  const high = bytes / total >= 0.8;

  return (
    <article
      className={high ? "storage-meter is-tight" : "storage-meter"}
      aria-label={`PostgreSQL database, ${storageLabel(bytes)} used, ${storageLabel(free)} free of ${storageLabel(total)}`}
    >
      <div className="storage-head">
        <div>
          <h2>Database</h2>
          <p>
            {disk
              ? `${storageLabel(bytes)} used · ${storageLabel(free)} free on the VPS disk`
              : `Current size ${storageLabel(bytes)}`}
          </p>
        </div>
        <p className="storage-figure">
          <strong>{storageLabel(bytes)}</strong>
          <span>of {storageLabel(total)}</span>
        </p>
      </div>
      <div className="storage-bar" aria-hidden>
        {bytes > 0 ? <i className="is-database" style={{ width: `${Math.max((bytes / scale) * 100, 0.4)}%` }} /> : null}
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

  const [storage, database, disk] = session.isSuperAdmin
    ? await Promise.all([loadStorageUsage(), loadDatabaseSize(), storageDiskCapacity()])
    : [null, null, null];
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
        <section className="grid gap-3 lg:grid-cols-2" aria-label="Database and storage usage">
          <StorageMeter usage={storage} disk={disk} />
          <DatabaseMeter bytes={database} disk={disk} />
        </section>
      )}

      <ReturnedNotes />
      {session.isSuperAdmin ? <AccountRequestsPanel /> : null}
      <ShipyardMark />
    </div>
  );
}
