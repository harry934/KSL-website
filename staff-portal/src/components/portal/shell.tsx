"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ActivityIndicators } from "@/components/portal/activity-indicators";
import { Sidebar } from "@/components/portal/sidebar";
import { Topbar } from "@/components/portal/topbar";
import { SessionProvider } from "@/components/portal/session-context";
import { cn } from "@/lib/cn";
import { usesSidebar } from "@/lib/portal-nav";
import type { StaffSession } from "@/lib/session";

const COLLAPSE_KEY = "ksl-sidebar-collapsed";
const WIDTH_KEY = "ksl-sidebar-width";
const SIDEBAR_DEFAULT = 268;
const SIDEBAR_MIN = 200;
const SIDEBAR_MAX = 420;

export function PortalShell({
  session,
  children,
}: {
  session: StaffSession;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const sidebarOn = usesSidebar(session);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT);
  const [resizing, setResizing] = useState(false);
  const widthRef = useRef(SIDEBAR_DEFAULT);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    const stored = Number(window.localStorage.getItem(WIDTH_KEY));
    if (stored >= SIDEBAR_MIN && stored <= SIDEBAR_MAX) {
      widthRef.current = stored;
      setSidebarWidth(stored);
    }
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function clampWidth(value: number) {
    return Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, Math.round(value)));
  }

  function applyWidth(value: number) {
    const next = clampWidth(value);
    widthRef.current = next;
    setSidebarWidth(next);
    return next;
  }

  function startResize(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startW = widthRef.current;
    setResizing(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    function move(e: PointerEvent) {
      applyWidth(startW + e.clientX - startX);
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setResizing(false);
      window.localStorage.setItem(WIDTH_KEY, String(widthRef.current));
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function nudgeWidth(delta: number) {
    const next = applyWidth(widthRef.current + delta);
    window.localStorage.setItem(WIDTH_KEY, String(next));
  }

  function toggleSidebar() {
    if (window.matchMedia("(max-width: 991.98px)").matches) {
      setMobileOpen((open) => !open);
      return;
    }
    setCollapsed((value) => {
      window.localStorage.setItem(COLLAPSE_KEY, value ? "0" : "1");
      return !value;
    });
  }

  return (
    <SessionProvider session={session}>
        <div
          className={cn(
            sidebarOn && collapsed && "app-collapsed",
            sidebarOn && mobileOpen && "app-mobile-open",
            sidebarOn && resizing && "is-resizing",
            !sidebarOn && "app-no-sidebar"
          )}
          style={{ "--sidebar-w": `${sidebarWidth}px` } as React.CSSProperties}
        >
          <div className="kenya-stripe" aria-hidden>
            <span />
            <span />
            <span />
          </div>
          <Suspense fallback={null}>
            <ActivityIndicators />
          </Suspense>
          {sidebarOn && <Sidebar session={session} />}
          {sidebarOn && (
            <div
              className={cn("sidebar-resizer", resizing && "is-dragging")}
              role="separator"
              aria-orientation="vertical"
              tabIndex={0}
              aria-label="Resize sidebar"
              aria-valuemin={SIDEBAR_MIN}
              aria-valuemax={SIDEBAR_MAX}
              aria-valuenow={sidebarWidth}
              onPointerDown={startResize}
              onDoubleClick={() => nudgeWidth(SIDEBAR_DEFAULT - widthRef.current)}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft") nudgeWidth(-16);
                if (event.key === "ArrowRight") nudgeWidth(16);
                if (event.key === "Home") nudgeWidth(SIDEBAR_MIN - widthRef.current);
                if (event.key === "End") nudgeWidth(SIDEBAR_MAX - widthRef.current);
              }}
            />
          )}
          {sidebarOn && <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} aria-hidden />}
          <div className="app-main">
            <Topbar session={session} collapsed={collapsed} showSidebar={sidebarOn} onToggleSidebar={toggleSidebar} />
            <main className="app-content">{children}</main>
          </div>
        </div>
    </SessionProvider>
  );
}
