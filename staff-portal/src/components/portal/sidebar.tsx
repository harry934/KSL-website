"use client";

import type { ComponentType } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  Calendar,
  Download,
  HelpCircle,
  Image as ImageIcon,
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
  gallery: ImageIcon,
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

  const linkClass = (active: boolean) =>
    cn(
      "flex items-center gap-3 rounded px-3 py-2.5 text-sm font-medium transition border-l-[3px]",
      active
        ? "border-[#99792c] bg-[#0165FC]/[0.06] text-[#09296C]"
        : "border-transparent text-[#5c6578] hover:border-[#C4A35A]/50 hover:bg-[#F7F9FB] hover:text-[#09296C]"
    );

  return (
    <aside className="flex w-[260px] shrink-0 flex-col border-r border-[#DDE5F0] bg-white">
      <div className="border-b border-[#DDE5F0] bg-[#0A3E95] px-5 py-4">
        <div className="flex items-center gap-3">
          <Image src="/ksl-logo.png" alt="" width={44} height={44} className="rounded-full bg-white p-0.5" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/80">Kenya Shipyards</p>
            <p className="ksl-display text-sm font-semibold text-white">Content portal</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        <Link href="/" className={linkClass(pathname === "/")}>
          <LayoutDashboard className="h-4 w-4 shrink-0 text-[#0165FC]" />
          Dashboard
        </Link>

        {modules.map((key) => {
          const href = MODULE_ROUTES[key];
          const Icon = ICONS[key] ?? LayoutDashboard;
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={key} href={href} className={linkClass(active)}>
              <Icon className={cn("h-4 w-4 shrink-0", active ? "text-[#0165FC]" : "text-[#9aa3b5]")} />
              {MODULE_LABELS[key]}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[#DDE5F0] bg-[#F7F9FB] p-4">
        <Link href="/account" className="mb-2 block text-xs font-semibold text-[#0165FC] hover:underline">
          Account settings
        </Link>
        <p className="truncate text-sm font-semibold text-[#09296C]">{session.displayName}</p>
        <p className="truncate text-xs text-[#5c6578]">{session.email}</p>
        {session.isSuperAdmin && (
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#99792c]">Super admin</p>
        )}
        <button
          type="button"
          onClick={() => signOut()}
          className="mt-3 flex w-full items-center gap-2 rounded px-2 py-2 text-sm text-[#5c6578] transition hover:bg-white hover:text-[#09296C]"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
