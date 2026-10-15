"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ActivityIndicators } from "@/components/portal/activity-indicators";
import { Sidebar } from "@/components/portal/sidebar";
import { Topbar } from "@/components/portal/topbar";
import { SessionProvider } from "@/components/portal/session-context";
import { FeedbackProvider } from "@/components/ui/feedback";
import { cn } from "@/lib/cn";
import type { StaffSession } from "@/lib/session";

const COLLAPSE_KEY = "ksl-sidebar-collapsed";

export function PortalShell({
  session,
  children,
}: {
  session: StaffSession;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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
      <FeedbackProvider>
        <div className={cn(collapsed && "app-collapsed", mobileOpen && "app-mobile-open")}>
          <div className="kenya-stripe" aria-hidden>
            <span />
            <span />
            <span />
          </div>
          <Suspense fallback={null}>
            <ActivityIndicators />
          </Suspense>
          <Sidebar session={session} />
          <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} aria-hidden />
          <div className="app-main">
            <Topbar session={session} collapsed={collapsed} onToggleSidebar={toggleSidebar} />
            <main className="app-content">{children}</main>
          </div>
        </div>
      </FeedbackProvider>
    </SessionProvider>
  );
}
