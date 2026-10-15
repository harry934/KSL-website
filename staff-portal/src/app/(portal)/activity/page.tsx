import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { MODULE_LABELS, type ModuleKey } from "@/lib/modules";
import { PageHeader } from "@/components/portal/page-header";
import { describeActivity } from "@/lib/activity-words";
import { cn } from "@/lib/cn";

const PAGE_SIZE = 50;

const pagerClass =
  "rounded-[6px] border border-[#d5dce4] bg-white px-3 py-1.5 font-semibold text-[#0b1f3a] transition-colors hover:bg-[#f6f8fa]";

function chip(active: boolean) {
  return cn(
    "rounded-full border px-3 py-1 transition-colors",
    active
      ? "border-[#0b1f3a] bg-[#0b1f3a] font-semibold text-white"
      : "border-[#d5dce4] bg-white text-[#1f2933] hover:bg-[#f6f8fa]"
  );
}

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

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; module?: string }>;
}) {
  const session = await getStaffSession();
  if (!session?.isSuperAdmin) redirect("/");

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const moduleFilter = params.module && params.module in MODULE_LABELS ? (params.module as ModuleKey) : null;

  let query = createAdminClient()
    .from("activity_log")
    .select("id, module_key, action, entity_type, entity_id, metadata, created_at, admin_profiles(display_name, username)", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (moduleFilter) query = query.eq("module_key", moduleFilter);

  const { data, count } = await query;
  const rows = (data ?? []) as unknown as Row[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const href = (p: number, m: string | null = moduleFilter) =>
    `/activity?page=${p}${m ? `&module=${m}` : ""}`;

  return (
    <div className="flex flex-col gap-[14px]">
      <PageHeader title="Activity log" description="Every sign-in and every change made in this portal, newest first." />

      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <span className="mr-1 font-semibold text-[#5b6775]">Show:</span>
        <Link href={href(1, null)} className={chip(!moduleFilter)}>
          Everything
        </Link>
        {(Object.keys(MODULE_LABELS) as ModuleKey[]).map((key) => (
          <Link key={key} href={href(1, key)} className={chip(moduleFilter === key)}>
            {MODULE_LABELS[key]}
          </Link>
        ))}
      </div>

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
                  Nothing here yet.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-[#eef1f4]">
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
