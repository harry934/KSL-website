"use client";

import type { ComponentType } from "react";
import Image from "next/image";
import Link from "next/link";
import kslLogo from "../../../public/ksl-logo.png";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  Building2,
  Calendar,
  Download,
  HandHeart,
  HelpCircle,
  History,
  Image as ImageIcon,
  LayoutDashboard,
  Megaphone,
  Newspaper,
  Package,
  Settings,
  UserCog,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { MODULE_GROUPS, MODULE_LABELS, MODULE_ROUTES, type ModuleKey } from "@/lib/modules";
import type { StaffSession } from "@/lib/session";

type IconType = ComponentType<{ className?: string }>;

const ICONS: Record<ModuleKey, IconType> = {
  news: Newspaper,
  events: Calendar,
  gallery: ImageIcon,
  services: Wrench,
  products: Package,
  careers: Briefcase,
  faq: HelpCircle,
  csr: HandHeart,
  downloads: Download,
  organization: Building2,
  press: Megaphone,
  site_settings: Settings,
  staff: UserCog,
};

function canSee(session: StaffSession, key: ModuleKey) {
  if (session.isSuperAdmin) return true;
  if (key === "staff") return false;
  return session.permissions.some((p) => p.module_key === key && p.can_view);
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: IconType;
  active: boolean;
}) {
  return (
    <Link href={href} title={label} className={cn("nav-link", active && "is-active")} prefetch>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="nav-link-label">{label}</span>
    </Link>
  );
}

export function Sidebar({ session }: { session: StaffSession }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/"));

  return (
    <aside className="app-sidebar" aria-label="Portal navigation">
      <div className="brand-block">
        <Image src={kslLogo} alt="Kenya Shipyards Limited" width={52} height={52} unoptimized priority className="shrink-0" />
        <div className="brand-text">
          <h1>Kenya Shipyards</h1>
          <p>Content portal</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col pb-4">
        <div className="nav-group">
          <p className="nav-group-label">Overview</p>
          <NavLink href="/" label="Dashboard" icon={LayoutDashboard} active={isActive("/")} />
        </div>

        {MODULE_GROUPS.map((group) => {
          const keys = group.modules.filter((key) => canSee(session, key));
          const showActivity = group.label === "Administration" && session.isSuperAdmin;
          if (!keys.length && !showActivity) return null;
          return (
            <div key={group.label} className="nav-group">
              <p className="nav-group-label">{group.label}</p>
              {keys.map((key) => (
                <NavLink
                  key={key}
                  href={MODULE_ROUTES[key]}
                  label={MODULE_LABELS[key]}
                  icon={ICONS[key]}
                  active={isActive(MODULE_ROUTES[key])}
                />
              ))}
              {showActivity && (
                <NavLink href="/activity" label="Activity log" icon={History} active={isActive("/activity")} />
              )}
            </div>
          );
        })}
      </nav>

      <p className="sidebar-footer">Kenya Shipyards Limited</p>
    </aside>
  );
}
