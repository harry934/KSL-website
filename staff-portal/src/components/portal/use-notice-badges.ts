"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ModuleKey } from "@/lib/modules";
import type { NoticeItem } from "@/lib/notifications";
import { SEEN_EVENT, readDismissed, readSeen } from "@/lib/notification-seen";

const POLL_MS = 60_000;

/** Unread count per sidebar section, using the same rows as the notification bell. */
export function useNoticeBadges(userId: string) {
  const [marks, setMarks] = useState<NoticeItem[]>([]);
  const [seenAt, setSeenAt] = useState(0);
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
    setSeenAt(readSeen(userId));
    setDismissed(readDismissed(userId));
    load();
    function onSeen() {
      setSeenAt(readSeen(userId));
      setDismissed(readDismissed(userId));
      load();
    }
    window.addEventListener(SEEN_EVENT, onSeen);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_MS);
    return () => {
      window.removeEventListener(SEEN_EVENT, onSeen);
      window.clearInterval(timer);
    };
  }, [load, userId]);

  return useMemo(() => {
    const counts: Partial<Record<ModuleKey, number>> = {};
    for (const mark of marks) {
      if (!mark.module) continue;
      if (mark.module === "messages" && mark.kind !== "message") continue;
      if (dismissed.includes(mark.id)) continue;
      const unread = mark.kind === "message" ? !!mark.unread : new Date(mark.createdAt).getTime() > seenAt;
      if (!unread) continue;
      counts[mark.module] = (counts[mark.module] ?? 0) + 1;
    }
    return counts;
  }, [dismissed, marks, seenAt]);
}
