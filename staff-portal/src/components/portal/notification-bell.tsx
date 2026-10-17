"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { readSeen, writeSeen } from "@/lib/notification-seen";

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

export function NotificationBell({ userId, canSeeAll }: { userId: string; canSeeAll: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [seenAt, setSeenAt] = useState(0);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (res.ok) setItems((await res.json()).items ?? []);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    setSeenAt(readSeen(userId));
    load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [load, userId]);

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isUnread = (item: Item) =>
    item.kind === "message" ? !!item.unread : new Date(item.createdAt).getTime() > seenAt;
  const unread = items.filter(isUnread).length;

  function markAllRead() {
    const now = Date.now();
    writeSeen(userId, now);
    setSeenAt(now);
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

  function openItem(item: Item) {
    setOpen(false);
    router.push(item.href);
  }

  return (
    <div className="relative" ref={wrap}>
      <button
        type="button"
        className="icon-button icon-quiet"
        title="Notifications"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
          if (!open) load();
        }}
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && <span className="notify-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div className="notification-dropdown" role="dialog" aria-label="Notifications">
          <div className="notification-dropdown-header">
            <div>
              <strong>Notifications</strong>
              <span className="notification-count">{unread ? `${unread} unread` : "You are up to date"}</span>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              {unread > 0 && (
                <button type="button" className="btn-quiet" onClick={markAllRead}>
                  Mark all read
                </button>
              )}
              {canSeeAll && (
                <button
                  type="button"
                  className="btn-quiet"
                  onClick={() => {
                    setOpen(false);
                    router.push("/activity");
                  }}
                >
                  View all
                </button>
              )}
            </div>
          </div>
          <div className="notification-dropdown-list">
            {!loaded && <p className="px-4 py-5 text-center text-[13px] text-[#6b7785]">Loading…</p>}
            {loaded && items.length === 0 && (
              <p className="px-4 py-6 text-center text-[13px] text-[#6b7785]">
                {canSeeAll ? "No messages or staff changes to show." : "No updates on items you have added."}
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
