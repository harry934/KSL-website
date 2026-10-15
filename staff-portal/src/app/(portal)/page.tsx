import { getStaffSession } from "@/lib/session";
import { MODULE_LABELS, MODULE_ROUTES, type ModuleKey } from "@/lib/modules";
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
      <div className="mb-8">
        <p className="text-slate-400">Welcome back, {session.displayName}.</p>
        <p className="mt-1 text-sm text-slate-500">
          Choose a module below. You only see areas your account is allowed to manage.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((key) => (
          <Link
            key={key}
            href={MODULE_ROUTES[key]}
            className="group rounded-xl border border-white/10 bg-[#0d2847]/60 p-5 transition hover:border-[#C4A35A]/40 hover:bg-[#0f2d52]"
          >
            <p className="font-semibold text-white">{MODULE_LABELS[key]}</p>
            <p className="mt-1 text-sm text-slate-500">Manage {MODULE_LABELS[key].toLowerCase()} content</p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#C4A35A] opacity-0 transition group-hover:opacity-100">
              Open <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
        ))}
      </div>

      {session.isSuperAdmin && (
        <div className="mt-10 rounded-xl border border-[#C4A35A]/30 bg-[#C4A35A]/5 p-5">
          <p className="font-semibold text-[#f0d9a0]">Super admin</p>
          <p className="mt-1 text-sm text-slate-400">
            Register staff and assign module permissions from the Staff area.
          </p>
          <Link
            href="/staff"
            className="mt-3 inline-block text-sm font-semibold text-[#C4A35A] hover:underline"
          >
            Manage staff →
          </Link>
        </div>
      )}
    </>
  );
}
