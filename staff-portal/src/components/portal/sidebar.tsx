"use client";

import Image from "next/image";
import Link from "next/link";
import kslLogo from "../../../public/ksl-logo.png";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { portalNavGroups } from "@/lib/portal-nav";
import type { StaffSession } from "@/lib/session";
import { iconForNav, type IconType } from "@/components/portal/module-icons";
import { useNoticeBadges } from "@/components/portal/use-notice-badges";

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  count = 0,
}: {
  href: string;
  label: string;
  icon: IconType;
  active: boolean;
  count?: number;
}) {
  const [tag, setTag] = useState<{ top: number; left: number } | null>(null);

  function showTag(target: HTMLElement) {
    const collapsed = document.querySelector(".app-collapsed");
    if (!collapsed || window.innerWidth < 992) {
      setTag(null);
      return;
    }
    const box = target.getBoundingClientRect();
    setTag({ top: box.top + box.height / 2, left: box.right + 10 });
  }

  return (
    <>
      <Link
        href={href}
        className={cn("nav-link", active && "is-active")}
        prefetch
        onMouseEnter={(event) => showTag(event.currentTarget)}
        onMouseLeave={() => setTag(null)}
        onFocus={(event) => showTag(event.currentTarget)}
        onBlur={() => setTag(null)}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="nav-link-label">{label}</span>
        {count > 0 && (
          <span className="nav-badge" aria-label={`${count} unread`}>
            {count > 9 ? "9+" : count}
          </span>
        )}
      </Link>
      {tag &&
        createPortal(
          <span className="nav-hover-tag" style={{ top: tag.top, left: tag.left }}>
            {label}
          </span>,
          document.body
        )}
    </>
  );
}

export function Sidebar({ session }: { session: StaffSession }) {
  const pathname = usePathname();
  const badges = useNoticeBadges(session.userId);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/"));

  return (
    <aside className="app-sidebar" aria-label="Portal navigation">
      <div className="brand-block">
        <Image src={kslLogo} alt="Kenya Shipyards Limited" width={52} height={52} unoptimized priority className="shrink-0" />
        <div className="brand-text">
          <h1>Kenya Shipyards Limited</h1>
          <p>Admin portal</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col pb-4">
        {portalNavGroups(session).map((group) => (
          <div key={group.label ?? group.links[0].href} className="nav-group">
            {group.label ? <p className="nav-group-label">{group.label}</p> : null}
            {group.links.map((link) => (
              <NavLink
                key={link.href}
                href={link.href}
                label={link.label}
                icon={iconForNav(link)}
                active={isActive(link.href)}
                count={link.module ? (badges[link.module] ?? 0) : 0}
              />
            ))}
          </div>
        ))}
      </nav>

      <p className="sidebar-footer">Ministry of Defence</p>
    </aside>
  );
}
