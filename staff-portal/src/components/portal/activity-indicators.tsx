"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { BUSY_EVENT, type BusyDetail } from "@/lib/upload-client";

/** Thin loading bar under the flag stripe. Button labels and ding toasts carry the save/delete feedback. */
export function ActivityIndicators() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [navigating, setNavigating] = useState(false);
  const [busyCount, setBusyCount] = useState(0);

  useEffect(() => {
    setNavigating(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const link = (event.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      setNavigating(true);
    }
    function onBusy(event: Event) {
      const detail = (event as CustomEvent<BusyDetail>).detail;
      setBusyCount((count) => Math.max(0, count + detail.delta));
    }
    document.addEventListener("click", onClick);
    window.addEventListener(BUSY_EVENT, onBusy);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener(BUSY_EVENT, onBusy);
    };
  }, []);

  return (navigating || busyCount > 0) ? <div className="app-progress-bar" aria-hidden /> : null;
}
