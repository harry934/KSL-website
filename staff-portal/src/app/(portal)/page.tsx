import { getStaffSession } from "@/lib/session";
import { MODULE_LABELS, MODULE_ROUTES, type ModuleKey } from "@/lib/modules";
import { PageHeader } from "@/components/portal/page-header";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default async function DashboardPage() {
  const session = await getStaffSession();
  if (!session) return null;

  const modules: ModuleKey[] = session.isSuperAdmin
    ? (Object.keys(MODULE_ROUTES) as ModuleKey[]).filter((k) => k !== "staff")
    : session.permissions.filter((p) => p.can_view).map((p) => p.module_key);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${session.displayName}. Open a module to update the public website.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((key) => (
          <Link
            key={key}
            href={MODULE_ROUTES[key]}
            className="ksl-card group p-5 transition hover:border-[#0165FC]/35 hover:shadow-md"
          >
            <p className="ksl-display font-semibold text-[#09296C]">{MODULE_LABELS[key]}</p>
            <p className="mt-1 text-sm text-[#5c6578]">Manage {MODULE_LABELS[key].toLowerCase()} content</p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-[#0165FC] opacity-0 transition group-hover:opacity-100">
              Open <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
        ))}
      </div>

      {session.isSuperAdmin && (
        <div className="mt-10 ksl-card border-l-4 border-l-[#99792c] p-5">
          <p className="ksl-display font-semibold text-[#09296C]">Super admin</p>
          <p className="mt-1 text-sm text-[#5c6578]">
            Register staff and assign which modules each agent can edit.
          </p>
          <Link href="/staff" className="mt-3 inline-block text-sm font-semibold text-[#0165FC] hover:underline">
            Manage staff →
          </Link>
        </div>
      )}
    </>
  );
}
