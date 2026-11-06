"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { NoticeItem } from "@/lib/notifications";
import { NOTICES_REFRESH, SEEN_EVENT, readDismissed } from "@/lib/notification-seen";

const POLL_MS = 15_000;

/** Recycle-bin count. Other admin changes stay in the notification bell. */
export function useNoticeBadges(userId: string) {
  const [marks, setMarks] = useState<NoticeItem[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setMarks(data.marks ?? data.items ?? []);
    } catch {
      /* The menu still works if the count cannot be loaded. */
    }
  }, []);

  useEffect(() => {
    setDismissed(readDismissed(userId));
    load();
    function onSeen() {
      setDismissed(readDismissed(userId));
      load();
    }
    window.addEventListener(SEEN_EVENT, onSeen);
    window.addEventListener(NOTICES_REFRESH, load);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_MS);
    return () => {
      window.removeEventListener(SEEN_EVENT, onSeen);
      window.removeEventListener(NOTICES_REFRESH, load);
      window.clearInterval(timer);
    };
  }, [load, userId]);

  return useMemo(() => {
    let recycle = 0;
    for (const mark of marks) {
      if (mark.pin !== "recycle" || dismissed.includes(mark.id)) continue;
      recycle += 1;
    }
    return { recycle };
  }, [dismissed, marks]);
}
