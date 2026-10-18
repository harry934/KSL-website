import Link from "next/link";
import { Plus } from "lucide-react";
import { getStaffSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAccess, MODULE_LABELS, MODULE_ROUTES, type ModuleKey } from "@/lib/modules";
import { addDays, formatDay, nairobiToday } from "@/lib/dates";
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

type DueItem = { href: string; title: string; detail: string };

async function closingSoon(session: NonNullable<Awaited<ReturnType<typeof getStaffSession>>>) {
  const admin = createAdminClient();
  const today = nairobiToday();
  const until = addDays(today, 14);
  const from = addDays(today, -7);
  const items: DueItem[] = [];

  if (canAccess(session.permissions, "careers", "view", session.isSuperAdmin)) {
    const { data } = await admin.from("career_listings").select("id, title, closing_date").eq("status", "published");
    for (const row of data ?? []) {
      const day = String(row.closing_date ?? "").slice(0, 10);
      if (!day || day < from || day > until) continue;
      items.push({
        href: `/careers?edit=${row.id}`,
        title: row.title,
        detail: day < today ? `The closing date was ${formatDay(day)}, and the job is still on the website.` : `Closes ${formatDay(day)}.`,
      });
    }
  }

  if (canAccess(session.permissions, "site_settings", "view", session.isSuperAdmin)) {
    const { data } = await admin.from("site_settings").select("value").eq("key", "announcement").maybeSingle();
    const value = (data?.value ?? null) as { enabled?: boolean; endsOn?: string; label?: string } | null;
    const ends = String(value?.endsOn ?? "").slice(0, 10);
    if (value?.enabled && ends && ends >= from && ends <= until) {
      items.push({
        href: "/settings",
        title: value.label?.trim() || "Website banner",
        detail: ends < today ? `The banner ended on ${formatDay(ends)}.` : `The banner ends on ${formatDay(ends)}.`,
      });
    }
  }

  return items;
}

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
  const due = await closingSoon(session);
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

      {due.length > 0 && (
        <section className="ksl-card">
          <div className="border-b border-[#eef1f4] px-5 py-4">
            <h2 className="text-[15px] font-bold text-[#0b1f3a]">Closing soon</h2>
          </div>
          <ul className="divide-y divide-[#eef1f4]">
            {due.map((item) => (
              <li key={item.href + item.title}>
                <Link href={item.href} className="block px-5 py-3 hover:bg-[#fafbfc]">
                  <p className="text-[14px] font-semibold text-[#0b1f3a]">{item.title}</p>
                  <p className="text-[13px] text-[#6b7785]">{item.detail}</p>
                </Link>
              </li>
            ))}
          </ul>
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
