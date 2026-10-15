import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { MODULE_LABELS, type ModuleKey } from "@/lib/modules";
import { PageHeader } from "@/components/portal/page-header";

const PAGE_SIZE = 50;

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
      <PageHeader title="Activity log" description="Every sign-in and content change made in the portal, newest first." />

      <div className="ksl-card flex flex-wrap items-center gap-2 p-[14px] text-[13px]">
        <span className="mr-1 text-[11px] font-bold uppercase tracking-[0.06em] text-[#5b6775]">Module</span>
        <Link
          href={href(1, null)}
          className={`rounded-[2px] border px-2.5 py-1 ${!moduleFilter ? "border-[#c5a028] bg-[#c5a028]/15 font-semibold" : "border-[#d7dde5]"}`}
        >
          All
        </Link>
        {(Object.keys(MODULE_LABELS) as ModuleKey[]).map((key) => (
          <Link
            key={key}
            href={href(1, key)}
            className={`rounded-[2px] border px-2.5 py-1 ${moduleFilter === key ? "border-[#c5a028] bg-[#c5a028]/15 font-semibold" : "border-[#d7dde5]"}`}
          >
            {MODULE_LABELS[key]}
          </Link>
        ))}
      </div>

      <div className="ksl-card overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead className="bg-[#f4f6f8] text-[11px] uppercase tracking-[0.06em] text-[#5b6775]">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Who</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Module</th>
              <th className="px-4 py-3">Item</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-[#5b6775]">
                  No activity recorded.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-[#eef2f6]">
                <td className="whitespace-nowrap px-4 py-2.5 text-[#5b6775]">{formatWhen(row.created_at)}</td>
                <td className="px-4 py-2.5">
                  <span className="font-semibold text-[#0b1f3a]">{row.admin_profiles?.display_name ?? "Deleted user"}</span>
                  {row.admin_profiles?.username && <span className="ml-1 text-[#5b6775]">@{row.admin_profiles.username}</span>}
                </td>
                <td className="px-4 py-2.5 capitalize">{row.action}</td>
                <td className="px-4 py-2.5 text-[#5b6775]">
                  {row.module_key && row.module_key in MODULE_LABELS ? MODULE_LABELS[row.module_key as ModuleKey] : row.module_key ?? "—"}
                </td>
                <td className="max-w-[280px] truncate px-4 py-2.5 text-[#5b6775]">
                  {row.entity_type?.replace(/_/g, " ") ?? ""}
                  {typeof row.metadata?.username === "string" ? ` · @${row.metadata.username}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-[13px] text-[#5b6775]">
        <span>
          Page {page} of {totalPages} · {count ?? 0} entries
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link href={href(page - 1)} className="rounded-[2px] border border-[#0b1f3a] px-3 py-1 font-semibold text-[#0b1f3a]">
              Newer
            </Link>
          )}
          {page < totalPages && (
            <Link href={href(page + 1)} className="rounded-[2px] border border-[#0b1f3a] px-3 py-1 font-semibold text-[#0b1f3a]">
              Older
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
