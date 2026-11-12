"use client";

import { useCallback, useEffect, useState } from "react";
import { NOTICES_REFRESH, SEEN_EVENT } from "@/lib/notification-seen";

const POLL_MS = 15_000;

/** Recycle-bin count. The number is how many deleted items are still in the bin. */
export function useNoticeBadges(userId: string) {
  const [recycle, setRecycle] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setRecycle(Number(data.recycleCount) || 0);
    } catch {
      /* The menu still works if the count cannot be loaded. */
    }
  }, []);

  useEffect(() => {
    load();
    window.addEventListener(SEEN_EVENT, load);
    window.addEventListener(NOTICES_REFRESH, load);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_MS);
    return () => {
      window.removeEventListener(SEEN_EVENT, load);
      window.removeEventListener(NOTICES_REFRESH, load);
      window.clearInterval(timer);
    };
  }, [load, userId]);

  return { recycle };
}
