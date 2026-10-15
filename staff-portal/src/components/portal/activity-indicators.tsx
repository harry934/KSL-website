"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { BUSY_EVENT, type BusyDetail } from "@/lib/upload-client";

const OVERLAY_DELAY_MS = 300;

/** Thin loading bar under the flag stripe, plus a "Please wait" overlay for saves that take a moment. */
export function ActivityIndicators() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [navigating, setNavigating] = useState(false);
  const [busyCount, setBusyCount] = useState(0);
  const [message, setMessage] = useState("Please wait…");
  const [overlay, setOverlay] = useState(false);
  const timer = useRef<number | null>(null);

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
      if (detail.message) setMessage(detail.message);
      setBusyCount((count) => Math.max(0, count + detail.delta));
    }
    document.addEventListener("click", onClick);
    window.addEventListener(BUSY_EVENT, onBusy);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener(BUSY_EVENT, onBusy);
    };
  }, []);

  useEffect(() => {
    if (busyCount > 0) {
      timer.current = window.setTimeout(() => setOverlay(true), OVERLAY_DELAY_MS);
    } else {
      setOverlay(false);
    }
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [busyCount]);

  return (
    <>
      {(navigating || busyCount > 0) && <div className="app-progress-bar" aria-hidden />}
      {overlay && (
        <div className="processing-overlay" role="status" aria-live="polite">
          <div className="processing-card">
            <span className="ksl-spinner" aria-hidden />
            <p>{message}</p>
          </div>
        </div>
      )}
    </>
  );
}
