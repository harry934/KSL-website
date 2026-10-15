"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Anchor,
  Briefcase,
  Calendar,
  Download,
  HelpCircle,
  Image,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Newspaper,
  Package,
  Settings,
  Users,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { MODULE_LABELS, MODULE_ROUTES, type ModuleKey } from "@/lib/modules";
import type { StaffSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/client";

const ICONS: Partial<Record<ModuleKey, ComponentType<{ className?: string }>>> = {
  news: Newspaper,
  events: Calendar,
  gallery: Image,
  services: Wrench,
  products: Package,
  careers: Briefcase,
  faq: HelpCircle,
  csr: Megaphone,
  downloads: Download,
  organization: Users,
  press: Megaphone,
  site_settings: Settings,
  staff: Users,
};

function visibleModules(session: StaffSession): ModuleKey[] {
  if (session.isSuperAdmin) {
    return Object.keys(MODULE_ROUTES) as ModuleKey[];
  }
  return session.permissions
    .filter((p) => p.can_view)
    .map((p) => p.module_key)
    .sort((a, b) => a.localeCompare(b));
}

export function Sidebar({ session }: { session: StaffSession }) {
  const pathname = usePathname();
  const modules = visibleModules(session);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-white/10 bg-[#071a33]">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#C4A35A]/15 text-[#C4A35A]">
          <Anchor className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">KSL</p>
          <p className="text-sm font-semibold text-white">Content portal</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
            pathname === "/"
              ? "bg-[#C4A35A]/15 text-[#f0d9a0]"
              : "text-slate-300 hover:bg-white/5 hover:text-white"
          )}
        >
          <LayoutDashboard className="h-4 w-4 shrink-0 opacity-80" />
          Dashboard
        </Link>

        {modules.map((key) => {
          const href = MODULE_ROUTES[key];
          const Icon = ICONS[key] ?? LayoutDashboard;
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={key}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-[#C4A35A]/15 text-[#f0d9a0]"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-80" />
              {MODULE_LABELS[key]}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <p className="truncate text-sm font-medium text-white">{session.displayName}</p>
        <p className="truncate text-xs text-slate-500">{session.email}</p>
        {session.isSuperAdmin && (
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#C4A35A]">
            Super admin
          </p>
        )}
        <button
          type="button"
          onClick={() => signOut()}
          className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
