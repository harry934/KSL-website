"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { dismissNotices, readDismissed, readSeen, SEEN_EVENT } from "@/lib/notification-seen";
import { NotificationCenter, type NotificationIcon, type NotificationItem, type NotificationTone } from "@/components/ui/notification-center";

type Item = {
  id: string;
  kind?: "activity" | "message" | "request" | "watch";
  who: string;
  text: string;
  area: string | null;
  href: string;
  createdAt: string;
  unread?: boolean;
  icon?: NotificationIcon;
  tone?: NotificationTone;
  source?: string;
  time?: string;
};

const POLL_MS = 15_000;

function timeAgo(iso: string) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Nairobi" }).format(new Date(iso));
}

export function NotificationBell({ userId }: { userId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [seenAt, setSeenAt] = useState(0);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const next = ((await res.json()).items ?? []) as Item[];
      setItems(next);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    setSeenAt(readSeen(userId));
    setDismissed(readDismissed(userId));
    load();
    function onSeen() {
      setSeenAt(readSeen(userId));
      setDismissed(readDismissed(userId));
    }
    window.addEventListener(SEEN_EVENT, onSeen);
    function onVisible() {
      if (document.visibilityState === "visible") load();
    }
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_MS);
    return () => {
      window.removeEventListener(SEEN_EVENT, onSeen);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [load, userId]);

  useEffect(() => {
    if (!open) return;
    function close(event: MouseEvent) {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isUnread = (item: Item) => {
    if (dismissed.includes(item.id)) return false;
    if (item.kind === "request" || item.kind === "watch") return true;
    return item.kind === "message" ? !!item.unread : new Date(item.createdAt).getTime() > seenAt;
  };

  const shown = items.filter((item) => !dismissed.includes(item.id));
  const unread = shown.filter(isUnread).length;
  const stack: NotificationItem[] = shown.map((item) => ({
    id: item.id,
    source: item.source || item.area || undefined,
    icon: item.icon,
    title: item.who,
    body: item.text,
    time: item.time || timeAgo(item.createdAt),
    unread: isUnread(item),
    tone: item.tone,
    href: item.href,
  }));

  function markMessages(ids: string[]) {
    const messageIds = items
      .filter((item) => ids.includes(item.id) && item.kind === "message" && item.unread)
      .map((item) => item.id.replace(/^message:/, ""));
    if (!messageIds.length) return;
    if (messageIds.length === items.filter((item) => item.kind === "message" && item.unread).length) {
      fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      }).catch(() => undefined);
      return;
    }
    for (const id of messageIds) {
      fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      }).catch(() => undefined);
    }
  }

  function openItem(item: NotificationItem) {
    dismissNotices(userId, [item.id]);
    markMessages([item.id]);
    setOpen(false);
    if (item.href) window.location.assign(item.href);
  }

  return (
    <div className="relative" ref={wrap}>
      <button
        type="button"
        className="icon-button icon-quiet"
        title="Notifications"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && <span className="notify-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div className="notification-dropdown !w-[min(420px,92vw)] !border-0 !bg-transparent !p-0 !shadow-none" role="dialog" aria-label="Notifications">
          {!loaded ? (
            <p className="rounded-2xl border border-[#e3e8ee] bg-white px-4 py-5 text-center text-[13px] text-[#6b7785]">Loading…</p>
          ) : (
            <NotificationCenter
              items={stack}
              title="Notifications"
              className="max-w-none"
              onDismiss={(id) => {
                dismissNotices(userId, [id]);
                markMessages([id]);
              }}
              onClearAll={() => {
                dismissNotices(userId, shown.map((item) => item.id));
                markMessages(shown.map((item) => item.id));
              }}
              onMarkAllRead={() => {
                dismissNotices(userId, shown.filter(isUnread).map((item) => item.id));
                markMessages(shown.map((item) => item.id));
              }}
              onSelect={openItem}
            />
          )}
        </div>
      )}
    </div>
  );
}
