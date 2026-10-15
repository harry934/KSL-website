import Link from "next/link";
import { getStaffSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { MODULE_LABELS, MODULE_ROUTES, type ModuleKey } from "@/lib/modules";
import { PageHeader } from "@/components/portal/page-header";

type CountRow = { module_key: ModuleKey; published: number; draft: number };
type ActivityRow = {
  id: string;
  module_key: string | null;
  action: string;
  entity_type: string | null;
  created_at: string;
  admin_profiles: { display_name: string; username: string } | null;
};

const QUICK_ACTIONS: { module: ModuleKey; label: string }[] = [
  { module: "news", label: "Post news" },
  { module: "events", label: "Add event" },
  { module: "gallery", label: "Upload photos" },
  { module: "careers", label: "Post vacancy" },
  { module: "downloads", label: "Add download" },
];

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Nairobi",
  }).format(new Date(iso));
}

function describe(row: ActivityRow) {
  const area = row.module_key && row.module_key in MODULE_LABELS ? MODULE_LABELS[row.module_key as ModuleKey] : row.module_key;
  const target = row.entity_type ? row.entity_type.replace(/_/g, " ") : "item";
  return `${row.action} ${target}${area ? ` in ${area}` : ""}`;
}

export default async function DashboardPage() {
  const session = await getStaffSession();
  if (!session) return null;

  const visible: ModuleKey[] = session.isSuperAdmin
    ? (Object.keys(MODULE_ROUTES) as ModuleKey[])
    : session.permissions.filter((p) => p.can_view && p.module_key !== "staff").map((p) => p.module_key);

  const admin = createAdminClient();
  let activityQuery = admin
    .from("activity_log")
    .select("id, module_key, action, entity_type, created_at, admin_profiles(display_name, username)")
    .order("created_at", { ascending: false })
    .limit(8);
  if (!session.isSuperAdmin) activityQuery = activityQuery.in("module_key", visible.length ? visible : ["-"]);

  const [countsRes, activityRes] = await Promise.all([admin.rpc("portal_content_counts"), activityQuery]);

  const counts = new Map(((countsRes.data ?? []) as CountRow[]).map((row) => [row.module_key, row]));
  const activity = (activityRes.data ?? []) as unknown as ActivityRow[];
  const quick = QUICK_ACTIONS.filter((action) => {
    if (session.isSuperAdmin) return true;
    return session.permissions.some((p) => p.module_key === action.module && p.can_edit);
  });

  return (
    <div className="flex flex-col gap-[14px]">
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${session.displayName}. Published and draft content across the modules you manage.`}
      />

      {quick.length > 0 && (
        <div className="ksl-card flex flex-wrap items-center gap-2 p-[14px]">
          <span className="mr-2 text-[11px] font-bold uppercase tracking-[0.06em] text-[#5b6775]">Quick actions</span>
          {quick.map((action) => (
            <Link
              key={action.module}
              href={MODULE_ROUTES[action.module]}
              className="inline-flex items-center rounded-[2px] border border-[#0b1f3a] px-[13px] py-[7px] text-[13px] font-semibold text-[#0b1f3a] transition hover:-translate-y-px hover:border-[#c5a028]"
            >
              {action.label}
            </Link>
          ))}
        </div>
      )}

      <div className="kpi-grid">
        {visible.map((key) => {
          const row = counts.get(key);
          const isStaff = key === "staff";
          const isSettings = key === "site_settings";
          return (
            <Link key={key} href={MODULE_ROUTES[key]} className="kpi-card">
              <h3>{MODULE_LABELS[key]}</h3>
              <strong>{row ? Number(row.published) : 0}</strong>
              <span className="kpi-hint">
                {isStaff
                  ? `${row ? Number(row.draft) : 0} suspended`
                  : isSettings
                    ? "Contact, socials, footer"
                    : `${row ? Number(row.draft) : 0} draft`}
              </span>
            </Link>
          );
        })}
      </div>

      <section className="ksl-card p-[14px]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-bold text-[#0b1f3a]">Recent activity</h2>
          {session.isSuperAdmin && (
            <Link href="/activity" className="text-[13px] font-semibold text-[#0b1f3a] underline-offset-2 hover:underline">
              Full log
            </Link>
          )}
        </div>
        {activity.length === 0 ? (
          <p className="text-sm text-[#5b6775]">No changes recorded yet.</p>
        ) : (
          <ul className="divide-y divide-[#d7dde5]">
            {activity.map((row) => (
              <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2 text-[13px]">
                <span className="min-w-0">
                  <strong className="text-[#0b1f3a]">{row.admin_profiles?.display_name || "Someone"}</strong>{" "}
                  <span className="text-[#1f2933]">{describe(row)}</span>
                </span>
                <span className="text-[12px] text-[#5b6775]">{formatWhen(row.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
