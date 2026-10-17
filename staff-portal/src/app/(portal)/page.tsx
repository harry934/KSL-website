import Link from "next/link";
import { Plus } from "lucide-react";
import { getStaffSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { MODULE_LABELS, MODULE_ROUTES, type ModuleKey } from "@/lib/modules";
import { describeActivity } from "@/lib/activity-words";
import { PageHeader } from "@/components/portal/page-header";
import { MODULE_ICONS } from "@/components/portal/module-icons";

type ActivityRow = {
  id: string;
  module_key: string | null;
  action: string;
  entity_type: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  admin_profiles: { display_name: string; username: string } | null;
};

const QUICK_ACTIONS: { module: ModuleKey; label: string }[] = [
  { module: "news", label: "Add a news story" },
  { module: "events", label: "Add an event" },
  { module: "gallery", label: "Upload photos" },
  { module: "careers", label: "Add a job opening" },
  { module: "downloads", label: "Add a document" },
];

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Nairobi",
  }).format(new Date(iso));
}

export default async function DashboardPage() {
  const session = await getStaffSession();
  if (!session) return null;

  let activity: ActivityRow[] = [];
  if (session.isSuperAdmin) {
    const activityRes = await createAdminClient()
      .from("activity_log")
      .select("id, module_key, action, entity_type, metadata, created_at, admin_profiles(display_name, username)")
      .order("created_at", { ascending: false })
      .limit(8);
    activity = (activityRes.data ?? []) as unknown as ActivityRow[];
  }
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

      {session.isSuperAdmin && (
      <section className="ksl-card">
        <div className="flex items-center justify-between gap-3 border-b border-[#eef1f4] px-5 py-4">
          <h2 className="text-[15px] font-bold text-[#0b1f3a]">Recent changes</h2>
          <Link href="/activity" className="text-[13px] font-semibold text-[#0b1f3a] underline-offset-2 hover:underline">
            See everything
          </Link>
        </div>
        {activity.length === 0 ? (
          <p className="px-5 py-6 text-[14px] text-[#6b7785]">No changes yet.</p>
        ) : (
          <ul className="divide-y divide-[#eef1f4]">
            {activity.map((row) => {
              const area =
                row.module_key && row.module_key in MODULE_LABELS ? MODULE_LABELS[row.module_key as ModuleKey] : null;
              return (
                <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-3 text-[13.5px]">
                  <span className="min-w-0">
                    <strong className="text-[#0b1f3a]">{row.admin_profiles?.display_name || "Someone"}</strong>{" "}
                    <span className="text-[#1f2933]">{describeActivity(row)}</span>
                    {area && row.module_key !== "staff" && <span className="text-[#6b7785]"> in {area}</span>}
                  </span>
                  <span className="text-[12px] text-[#6b7785]">{formatWhen(row.created_at)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      )}
    </div>
  );
}
