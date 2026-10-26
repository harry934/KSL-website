"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Bell, CalendarClock, CalendarDays, CircleAlert, KeyRound, Mail, UserRound, Check, X } from "lucide-react";

export type NotificationTone = "default" | "info" | "success" | "warning" | "danger";

export type NotificationIcon = "bell" | "password" | "username" | "message" | "closing" | "attention" | "scheduled";

export interface NotificationItem {
  id: string;
  source?: string;
  icon?: NotificationIcon;
  title: string;
  body: string;
  time: string;
  unread?: boolean;
  tone?: NotificationTone;
  href?: string;
}

export interface NotificationStackProps {
  items: NotificationItem[];
  title?: string;
  defaultExpanded?: boolean;
  showFooter?: boolean;
  staggerMs?: number;
  className?: string;
  onDismiss?: (id: string) => void;
  onClearAll?: () => void;
  onMarkAllRead?: () => void;
  onSelect?: (item: NotificationItem) => void;
  /** Hide Mark all read and Clear. Used when the list is a working set, not an inbox. */
  showActions?: boolean;
}

const TONE: Record<NotificationTone, { bar: string; tile: string }> = {
  default: { bar: "bg-[#0b1f3a]", tile: "bg-[#f4f6f8] text-[#0b1f3a]" },
  info: { bar: "bg-[#125d95]", tile: "bg-[#e8f2fa] text-[#125d95]" },
  success: { bar: "bg-[#1b7a3d]", tile: "bg-[#e7f6ec] text-[#1b7a3d]" },
  warning: { bar: "bg-[#c5a028]", tile: "bg-[#fbf6e6] text-[#8a6d12]" },
  danger: { bar: "bg-[#b42318]", tile: "bg-[#fdecea] text-[#b42318]" },
};

function NoticeGlyph({ name }: { name: NotificationIcon }) {
  const props = { className: "size-4", strokeWidth: 2, "aria-hidden": true as const };
  if (name === "password") return <KeyRound {...props} />;
  if (name === "username") return <UserRound {...props} />;
  if (name === "message") return <Mail {...props} />;
  if (name === "closing") return <CalendarClock {...props} />;
  if (name === "attention") return <CircleAlert {...props} />;
  if (name === "scheduled") return <CalendarDays {...props} />;
  return <Bell {...props} />;
}

/**
 * Stacked notification list. Each row has a coloured icon, a tone bar,
 * and the short explanation. Opening a row goes to the related page.
 */
export function NotificationCenter({
  items,
  title = "Notifications",
  defaultExpanded = true,
  showFooter = true,
  staggerMs = 50,
  className = "",
  onDismiss,
  onClearAll,
  onMarkAllRead,
  onSelect,
  showActions = true,
}: NotificationStackProps): ReactNode {
  const [rows, setRows] = useState<NotificationItem[]>(items);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setRows(items);
  }, [items]);

  const visible = useMemo(
    () => (defaultExpanded ? rows : rows.filter((item) => item.unread)),
    [rows, defaultExpanded]
  );
  const unreadCount = rows.filter((item) => item.unread).length;

  function toggleOpen(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function dismiss(id: string) {
    setRows((prev) => prev.filter((item) => item.id !== id));
    onDismiss?.(id);
  }

  function clearAll() {
    setRows([]);
    onClearAll?.();
  }

  function markAllRead() {
    setRows((prev) => prev.map((item) => ({ ...item, unread: false })));
    onMarkAllRead?.();
  }

  return (
    <section className={"w-full overflow-hidden rounded-2xl border border-[#e3e8ee] bg-white text-[#1f2933] shadow-[0_12px_28px_rgba(11,31,58,0.12)] " + className}>
      <style>{`
        @keyframes nstack-in {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .nstack-row { animation: nstack-in 260ms ease-out both; }
      `}</style>

      <header className="flex items-center justify-between gap-2 border-b border-[#eef1f4] bg-[#f6f8fa] px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-[#0b1f3a]">{title}</h2>
          {unreadCount > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0b1f3a] px-1.5 text-[11px] font-semibold leading-none text-white">
              {unreadCount}
            </span>
          )}
        </div>
        {showActions && rows.length > 0 && (
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs font-semibold text-[#5b6775] transition-colors hover:text-[#0b1f3a]">
                Mark all read
              </button>
            )}
            <button type="button" onClick={clearAll} className="text-xs font-semibold text-[#5b6775] transition-colors hover:text-[#b42318]">
              Clear
            </button>
          </div>
        )}
      </header>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-[#5b6775]">
          <Check className="size-5 text-[#1b7a3d]" aria-hidden />
          <p className="text-sm">You are up to date</p>
        </div>
      ) : (
        <ul className="max-h-[420px] divide-y divide-[#eef1f4] overflow-auto">
          {visible.map((item, index) => {
            const open = openIds.has(item.id);
            const tone = TONE[item.tone ?? "default"];
            return (
              <li
                key={item.id}
                className="nstack-row group relative flex cursor-pointer gap-3 px-4 py-3 pl-5 transition-colors hover:bg-[#f8fafc]"
                style={{ animationDelay: `${index * staggerMs}ms` }}
                onClick={() => {
                  if (onSelect) onSelect(item);
                  else toggleOpen(item.id);
                }}
              >
                <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${tone.bar}`} />
                <span className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-[#e3e8ee] ${tone.tile}`}>
                  <NoticeGlyph name={item.icon ?? "bell"} />
                </span>
                <div className="min-w-0 flex-1">
                  {item.source && (
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6b7785]">{item.source}</p>
                  )}
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-semibold text-[#0b1f3a]">{item.title}</p>
                    <time className="shrink-0 text-xs text-[#6b7785]">{item.time}</time>
                  </div>
                  <p className={"pt-0.5 text-sm text-[#5b6775] " + (open ? "" : "line-clamp-2")}>{item.body}</p>
                </div>
                <span className="flex shrink-0 flex-col items-center justify-between py-0.5">
                  {item.unread && <span className="size-2 rounded-full bg-[#c5a028]" aria-label="Unread" />}
                  {showActions && (
                  <button
                    type="button"
                    aria-label={`Dismiss ${item.title}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      dismiss(item.id);
                    }}
                    className="ml-1 rounded-md p-1 text-[#6b7785] opacity-0 transition-opacity hover:bg-[#eef1f4] hover:text-[#0b1f3a] focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {showFooter && (
        <footer className="border-t border-[#eef1f4] bg-[#f8fafc] px-4 py-2.5 text-xs text-[#6b7785]">
          {rows.length === 0
            ? "Nothing pending"
            : `${rows.length} notification${rows.length === 1 ? "" : "s"}`}
        </footer>
      )}
    </section>
  );
}

export default NotificationCenter;
