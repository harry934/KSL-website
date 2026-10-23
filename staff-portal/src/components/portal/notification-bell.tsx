"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { dismissNotices, readDismissed, readSeen, SEEN_EVENT } from "@/lib/notification-seen";

type Item = {
  id: string;
  kind?: "activity" | "message";
  who: string;
  text: string;
  area: string | null;
  href: string;
  createdAt: string;
  unread?: boolean;
};

const POLL_MS = 60_000;

function timeAgo(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Nairobi" }).format(new Date(iso));
}

export function NotificationBell({ userId }: { userId: string }) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [seenAt, setSeenAt] = useState(0);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [glance, setGlance] = useState("");
  const [loaded, setLoaded] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const openRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const next = ((await res.json()).items ?? []) as Item[];
      setItems(next);
      if (openRef.current) dismissNotices(userId, next.map((item) => item.id));
    } finally {
      setLoaded(true);
    }
  }, [userId]);

  useEffect(() => {
    setSeenAt(readSeen(userId));
    setDismissed(readDismissed(userId));
    load();
    function onSeen() {
      setSeenAt(readSeen(userId));
      setDismissed(readDismissed(userId));
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

  useEffect(() => {
    if (!open) return;
    function close() {
      openRef.current = false;
      setOpen(false);
    }
    function onClick(event: MouseEvent) {
      if (!wrap.current?.contains(event.target as Node)) close();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isUnread = (item: Item) => {
    if (dismissed.includes(item.id)) return false;
    return item.kind === "message" ? !!item.unread : new Date(item.createdAt).getTime() > seenAt;
  };
  const changes = items.filter((item) => item.kind !== "message" && isUnread(item)).length;
  const messages = items.filter((item) => item.kind === "message" && isUnread(item)).length;
  const unread = changes + messages;

  function summary() {
    if (!unread) return "You are up to date";
    const parts: string[] = [];
    if (changes) parts.push(`${changes} new ${changes === 1 ? "change" : "changes"}`);
    if (messages) parts.push(`${messages} new ${messages === 1 ? "message" : "messages"}`);
    return parts.join(", ");
  }

  function markAllRead() {
    dismissNotices(userId, items.map((item) => item.id));
    if (items.some((item) => item.kind === "message" && item.unread)) {
      fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      })
        .then(() => load())
        .catch(() => undefined);
    }
  }

  function openBell() {
    const next = !open;
    openRef.current = next;
    setOpen(next);
    if (next) {
      setGlance(summary());
      dismissNotices(
        userId,
        items.filter(isUnread).map((item) => item.id)
      );
      load();
    }
  }

  function openItem(item: Item) {
    dismissNotices(userId, [item.id]);
    openRef.current = false;
    setOpen(false);
    if (item.kind === "message" && item.unread) {
      const id = item.id.replace(/^message:/, "");
      fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      }).catch(() => undefined);
    }
    if (item.href && item.href !== window.location.pathname + window.location.search) {
      window.location.assign(item.href);
      return;
    }
    router.push(item.href || "/");
  }

  return (
    <div className="relative" ref={wrap}>
      <button
        type="button"
        className="icon-button icon-quiet"
        title="Notifications"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        onClick={openBell}
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && <span className="notify-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div className="notification-dropdown" role="dialog" aria-label="Notifications">
          <div className="notification-dropdown-header">
            <div>
              <strong>Notifications</strong>
              <span className="notification-count">{open && glance ? glance : summary()}</span>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              {unread > 0 && (
                <button type="button" className="btn-quiet" onClick={markAllRead}>
                  Mark all read
                </button>
              )}
            </div>
          </div>
          <div className="notification-dropdown-list">
            {!loaded && <p className="px-4 py-5 text-center text-[13px] text-[#6b7785]">Loading…</p>}
            {loaded && items.length === 0 && (
              <p className="px-4 py-6 text-center text-[13px] text-[#6b7785]">
                No new messages.
              </p>
            )}
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`notification-item${isUnread(item) ? " is-unread" : ""}`}
                onClick={() => openItem(item)}
              >
                <strong>{item.who}</strong>
                <span>
                  {item.text}
                  {item.area ? ` in ${item.area}` : ""}
                </span>
                <em>{timeAgo(item.createdAt)}</em>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
