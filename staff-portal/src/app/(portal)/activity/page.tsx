import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { MODULE_LABELS, type ModuleKey } from "@/lib/modules";
import { PageHeader } from "@/components/portal/page-header";
import { describeActivity } from "@/lib/activity-words";
import { activityPlace } from "@/lib/activity-place";
import { cn } from "@/lib/cn";
import { controlClass } from "@/components/ui/input";

const PAGE_SIZE = 50;

const UUID = /^[0-9a-f-]{36}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const ACTION_GROUPS: Record<string, { label: string; actions: string[] }> = {
  saved: { label: "Saved or added", actions: ["upsert", "update", "save", "create"] },
  published: { label: "Put on the website", actions: ["publish"] },
  deleted: { label: "Deleted", actions: ["delete"] },
  signin: { label: "Signed in", actions: ["sign in"] },
  account: {
    label: "Account and password changes",
    actions: ["change password", "update profile", "reset password", "permissions", "profile", "set active"],
  },
};

const pagerClass =
  "inline-flex h-[38px] items-center rounded-[6px] border border-[#d5dce4] bg-white px-3 text-[13px] font-semibold text-[#0b1f3a] transition-colors hover:bg-[#f6f8fa]";

const applyClass =
  "inline-flex h-[38px] items-center rounded-[6px] bg-[#0b1f3a] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#13294b]";

const filterControl = cn(controlClass, "mt-1 h-[38px] font-normal");

function capitalise(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

type Row = {
  id: string;
  module_key: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  admin_profiles: { display_name: string; username: string } | null;
};

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Nairobi",
  }).format(new Date(iso));
}

type Params = { page?: string; module?: string; who?: string; what?: string; from?: string; to?: string; entry?: string };

export default async function ActivityPage({ searchParams }: { searchParams: Promise<Params> }) {
  const session = await getStaffSession();
  if (!session?.isSuperAdmin) redirect("/");

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const moduleFilter = params.module && params.module in MODULE_LABELS ? (params.module as ModuleKey) : null;
  const who = params.who && UUID.test(params.who) ? params.who : "";
  const what = params.what && params.what in ACTION_GROUPS ? params.what : "";
  const from = params.from && DATE.test(params.from) ? params.from : "";
  const to = params.to && DATE.test(params.to) ? params.to : "";
  const entryId = params.entry && UUID.test(params.entry) ? params.entry : "";
  const filtered = Boolean(moduleFilter || who || what || from || to);

  const admin = createAdminClient();
  let query = admin
    .from("activity_log")
    .select("id, module_key, action, entity_type, entity_id, metadata, created_at, admin_profiles(display_name, username)", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (moduleFilter) query = query.eq("module_key", moduleFilter);
  if (who) query = query.eq("actor_id", who);
  if (what) query = query.in("action", ACTION_GROUPS[what].actions);
  if (from) query = query.gte("created_at", `${from}T00:00:00+03:00`);
  if (to) query = query.lte("created_at", `${to}T23:59:59.999+03:00`);

  const entryQuery = entryId
    ? admin
        .from("activity_log")
        .select("id, module_key, action, entity_type, entity_id, metadata, created_at, admin_profiles(display_name, username)")
        .eq("id", entryId)
        .maybeSingle()
    : Promise.resolve({ data: null });

  const [{ data, count }, { data: people }, { data: entryRow }] = await Promise.all([
    query,
    admin.from("admin_profiles").select("id, display_name, username").order("display_name"),
    entryQuery,
  ]);
  const rows = (data ?? []) as unknown as Row[];
  const featured = (entryRow ?? null) as Row | null;
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const href = (p: number, m: string | null = moduleFilter) => {
    const qs = new URLSearchParams({ page: String(p) });
    if (m) qs.set("module", m);
    if (who) qs.set("who", who);
    if (what) qs.set("what", what);
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    if (entryId) qs.set("entry", entryId);
    return `/activity?${qs}`;
  };

  return (
    <div className="flex flex-col gap-[14px]">
      <PageHeader title="Audit log" description="Every sign-in and every change made in this portal, newest first." />

      {entryId && (
        <section className="ksl-card border-[#c5a028] p-4">
          <p className="text-[12.5px] font-semibold uppercase tracking-wide text-[#99792c]">Selected entry</p>
          {featured ? (
            <p className="mt-2 text-[15px] text-[#0b1f3a]">
              <span className="font-semibold">{featured.admin_profiles?.display_name ?? "Removed account"}</span>
              {featured.admin_profiles?.username ? <span className="text-[#6b7785]"> @{featured.admin_profiles.username}</span> : null}
              {" "}
              {describeActivity(featured)}
              {featured.module_key && featured.module_key in MODULE_LABELS
                ? ` in ${MODULE_LABELS[featured.module_key as ModuleKey]}`
                : ""}
              <span className="mt-1 block text-[13px] text-[#6b7785]">{formatWhen(featured.created_at)}</span>
              <Link className="mt-2 inline-block text-[13.5px] font-semibold text-[#0b1f3a] underline" href={activityPlace(featured)}>
                Open this change
              </Link>
            </p>
          ) : (
            <p className="mt-2 text-[14px] text-[#6b7785]">That audit entry is no longer available.</p>
          )}
        </section>
      )}

      <form method="get" action="/activity" className="ksl-card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto_auto_auto]">
        <label className="text-[12.5px] font-semibold text-[#5b6775]">
          Person
          <select name="who" defaultValue={who} className={filterControl}>
            <option value="">Everyone</option>
            {(people ?? []).map((person) => (
              <option key={person.id} value={person.id}>
                {person.display_name || person.username}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[12.5px] font-semibold text-[#5b6775]">
          Section
          <select name="module" defaultValue={moduleFilter ?? ""} className={filterControl}>
            <option value="">All sections</option>
            {(Object.keys(MODULE_LABELS) as ModuleKey[]).map((key) => (
              <option key={key} value={key}>
                {MODULE_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[12.5px] font-semibold text-[#5b6775]">
          What happened
          <select name="what" defaultValue={what} className={filterControl}>
            <option value="">Anything</option>
            {Object.entries(ACTION_GROUPS).map(([key, group]) => (
              <option key={key} value={key}>
                {group.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[12.5px] font-semibold text-[#5b6775]">
          From
          <input type="date" name="from" defaultValue={from} className={filterControl} />
        </label>
        <label className="text-[12.5px] font-semibold text-[#5b6775]">
          To
          <input type="date" name="to" defaultValue={to} className={filterControl} />
        </label>
        <div className="flex items-end gap-2">
          <button type="submit" className={applyClass}>
            Apply
          </button>
          {filtered && (
            <Link href="/activity" className={pagerClass}>
              Clear
            </Link>
          )}
        </div>
      </form>

      <div className="ksl-card overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[13.5px]">
          <thead className="bg-[#f6f8fa] text-[12.5px] font-semibold text-[#5b6775]">
            <tr>
              <th className="px-4 py-3 font-semibold">When</th>
              <th className="px-4 py-3 font-semibold">Who</th>
              <th className="px-4 py-3 font-semibold">What they did</th>
              <th className="px-4 py-3 font-semibold">Section</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-[#6b7785]">
                  {filtered ? (
                    <>
                      No results found.{" "}
                      <Link href="/activity" className="font-semibold text-[#0b1f3a] underline">
                        Clear filters
                      </Link>
                    </>
                  ) : (
                    "Nothing here yet."
                  )}
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} id={row.id === entryId ? "audit-entry" : undefined} className={row.id === entryId ? "border-t border-[#eef1f4] bg-[#fff8e8]" : "border-t border-[#eef1f4]"}>
                <td className="whitespace-nowrap px-4 py-3 text-[#6b7785]">{formatWhen(row.created_at)}</td>
                <td className="px-4 py-3">
                  <span className="font-semibold text-[#0b1f3a]">{row.admin_profiles?.display_name ?? "Removed account"}</span>
                  {row.admin_profiles?.username && <span className="ml-1 text-[#6b7785]">@{row.admin_profiles.username}</span>}
                </td>
                <td className="px-4 py-3 text-[#1f2933]">
                  {capitalise(describeActivity(row))}
                </td>
                <td className="px-4 py-3 text-[#6b7785]">
                  {row.module_key && row.module_key in MODULE_LABELS ? MODULE_LABELS[row.module_key as ModuleKey] : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-[13px] text-[#5b6775]">
        <span>
          Page {page} of {totalPages} · {count ?? 0} changes
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link href={href(page - 1)} className={pagerClass}>
              Newer
            </Link>
          )}
          {page < totalPages && (
            <Link href={href(page + 1)} className={pagerClass}>
              Older
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
