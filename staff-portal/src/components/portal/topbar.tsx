"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, KeyRound, LayoutDashboard, LogOut, PanelLeft } from "lucide-react";
import { cn } from "@/lib/cn";
import { MODULE_LABELS, MODULE_ROUTES, type ModuleKey } from "@/lib/modules";
import { roleLabel } from "@/lib/staff-role";
import type { StaffSession } from "@/lib/session";
import { signOutNow } from "@/lib/sign-out-client";
import { NotificationBell } from "@/components/portal/notification-bell";
import { PortalSearch } from "@/components/portal/portal-search";
import { UserAvatar } from "@/components/portal/user-avatar";

const EXTRA_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/account": "My account",
  "/activity": "Audit log",
  "/banner": "Banner",
  "/images": "Website images",
  "/recycle": "Recycle bin",
};

function titleFor(pathname: string) {
  if (EXTRA_TITLES[pathname]) return EXTRA_TITLES[pathname];
  const match = (Object.keys(MODULE_ROUTES) as ModuleKey[]).find(
    (key) => pathname === MODULE_ROUTES[key] || pathname.startsWith(MODULE_ROUTES[key] + "/")
  );
  return match ? MODULE_LABELS[match] : "Admin portal";
}

export function Topbar({
  session,
  collapsed,
  showSidebar = true,
  onToggleSidebar,
}: {
  session: StaffSession;
  collapsed: boolean;
  showSidebar?: boolean;
  onToggleSidebar: () => void;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const role = roleLabel(session.isSuperAdmin, session.roleTitle);

  return (
    <header className="app-topbar">
      <div className="flex min-w-0 items-center gap-3">
        {showSidebar ? (
          <button
            type="button"
            className="icon-button"
            onClick={onToggleSidebar}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        ) : pathname !== "/" ? (
          <Link href="/" className="icon-button gap-1.5" aria-label="Dashboard">
            <LayoutDashboard className="h-4 w-4" />
            <span className="text-[13px] font-semibold">Dashboard</span>
          </Link>
        ) : null}
        <p className={cn("truncate text-[15px] font-bold text-[#0b1f3a]", showSidebar && "hidden sm:block")}>{titleFor(pathname)}</p>
      </div>

      <PortalSearch />

      <div className="flex items-center gap-1.5">
        <NotificationBell userId={session.userId} />

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            className="user-chip"
            title="My account"
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <UserAvatar name={session.displayName} url={session.avatarUrl} />
            <span className="hidden min-w-0 flex-col sm:flex">
              <strong className="max-w-[160px] truncate text-[13px] text-[#0b1f3a]">{session.displayName}</strong>
              <span className="text-[11px] text-[#5b6775]">{role}</span>
            </span>
            <ChevronDown className="h-4 w-4 text-[#5b6775]" />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+6px)] z-50 w-60 overflow-hidden rounded-[10px] border border-[#e3e8ee] bg-white p-1 shadow-[0_12px_28px_rgba(11,31,58,0.16)]"
            >
              <div className="mb-1 border-b border-[#eef1f4] px-3 py-2.5">
                <p className="truncate text-[14px] font-semibold text-[#0b1f3a]">{session.displayName}</p>
                <p className="truncate text-[12px] text-[#6b7785]">Username: {session.username}</p>
              </div>
              <Link
                href="/account"
                role="menuitem"
                className="flex items-center gap-2 rounded-[6px] px-3 py-2 text-[14px] text-[#1f2933] hover:bg-[#f4f6f8]"
                onClick={() => setMenuOpen(false)}
              >
                <KeyRound className="h-4 w-4 text-[#5b6775]" />
                My account and password
              </Link>
            </div>
          )}
        </div>

        <button
          type="button"
          className="btn-quiet"
          disabled={signingOut}
          onClick={() => {
            setSigningOut(true);
            void signOutNow();
          }}
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
          <span className={signingOut ? "inline" : "hidden md:inline"}>{signingOut ? "Signing out…" : "Sign out"}</span>
        </button>
      </div>
    </header>
  );
}
