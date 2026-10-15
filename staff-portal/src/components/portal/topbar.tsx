"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, KeyRound, LogOut, PanelLeft } from "lucide-react";
import { MODULE_LABELS, MODULE_ROUTES, type ModuleKey } from "@/lib/modules";
import type { StaffSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/client";

const EXTRA_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/account": "My account",
  "/activity": "Activity log",
};

function titleFor(pathname: string) {
  if (EXTRA_TITLES[pathname]) return EXTRA_TITLES[pathname];
  const match = (Object.keys(MODULE_ROUTES) as ModuleKey[]).find(
    (key) => pathname === MODULE_ROUTES[key] || pathname.startsWith(MODULE_ROUTES[key] + "/")
  );
  return match ? MODULE_LABELS[match] : "Content portal";
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function Topbar({
  session,
  collapsed,
  onToggleSidebar,
}: {
  session: StaffSession;
  collapsed: boolean;
  onToggleSidebar: () => void;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
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

  async function signOut() {
    await createClient().auth.signOut();
    window.location.href = "/login";
  }

  const role = session.isSuperAdmin ? "Administrator" : "Agent";

  return (
    <header className="app-topbar">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          className="icon-button"
          onClick={onToggleSidebar}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <PanelLeft className="h-4 w-4" />
        </button>
        <p className="truncate text-[15px] font-bold text-[#0b1f3a]">{titleFor(pathname)}</p>
      </div>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          className="user-chip"
          onClick={() => setMenuOpen((open) => !open)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <span className="user-avatar" aria-hidden>
            {initials(session.displayName) || "K"}
          </span>
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
            <button
              type="button"
              role="menuitem"
              onClick={signOut}
              className="flex w-full items-center gap-2 rounded-[6px] px-3 py-2 text-left text-[14px] text-[#b42318] hover:bg-[#fdf1f0]"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
