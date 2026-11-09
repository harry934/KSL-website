"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  Forward,
  Inbox,
  Loader2,
  Lock,
  Mail,
  PanelLeftClose,
  PanelLeftOpen,
  Reply,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import { useCan } from "@/components/portal/session-context";
import { Button } from "@/components/ui/button";
import { useFeedback } from "@/components/ui/feedback";
import { Notice } from "@/components/ui/form-bits";
import { PasswordInput } from "@/components/ui/password-input";
import { cn } from "@/lib/cn";
import { gmailComposeUrl, openMailto, outlookWebComposeUrl } from "@/lib/mail-compose";
import { forwardPlainBody, forwardSubject, replyPlainBody, replySubject } from "@/lib/message-forward";
import { refreshNotices } from "@/lib/notification-seen";

type Message = {
  id: string;
  first_name: string;
  other_name: string | null;
  surname: string;
  email: string;
  subject: string;
  message: string;
  preferred_contact: string | null;
  submitter_ip: string | null;
  risk_score: number | null;
  risk_flags: string[] | null;
  created_at: string;
  read_at: string | null;
  deleted_at?: string | null;
  locked?: boolean;
};

type Filter = "all" | "unread" | "risk";

const FILTER_META: Record<Filter, { label: string; icon: typeof Inbox }> = {
  all: { label: "All", icon: Inbox },
  unread: { label: "Unread", icon: Mail },
  risk: { label: "High risk", icon: ShieldAlert },
};

const LIST_COLLAPSE_KEY = "ksl-messages-list-collapsed";

const FLAG_LABELS: Record<string, string> = {
  suspicious_name: "Suspicious name",
  link_in_name: "Link in name",
  name_has_numbers: "Numbers in name",
  all_caps_name: "All-caps name",
  unusual_name_characters: "Unusual name",
  disposable_email: "Disposable email",
  long_email: "Long email",
  injection_pattern: "Code-like text",
  contains_links: "Links",
  many_links: "Many links",
  short_message_with_link: "Short + link",
  repeated_characters: "Spam pattern",
  high_risk: "High risk",
  encoded_layers: "Encoded text",
  encoded_obfuscation: "Hidden encoding",
};

function when(iso: string) {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Nairobi",
  }).format(new Date(iso));
}

function listWhen(iso: string) {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Intl.DateTimeFormat("en-KE", { month: "short", day: "numeric", timeZone: "Africa/Nairobi" }).format(date);
}

function previewText(text: string, max = 72) {
  const flat = text.replace(/\s+/g, " ").trim();
  if (!flat) return "";
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

function fullName(row: Message) {
  return [row.first_name, row.other_name, row.surname].filter(Boolean).join(" ");
}

function initials(row: Message) {
  const parts = [row.first_name, row.surname].filter(Boolean);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

function RiskBadges({ row, compact }: { row: Message; compact?: boolean }) {
  const score = row.risk_score ?? 0;
  const flags = row.risk_flags ?? [];
  if (!score && !flags.length) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", !compact && "mt-2")}>
      {score > 0 && (
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-semibold",
            score >= 40 ? "bg-[#fde8e8] text-[#9b1c1c]" : score >= 20 ? "bg-[#fff4e5] text-[#9a6700]" : "bg-[#eef1f4] text-[#5b6775]"
          )}
        >
          Risk {score}
        </span>
      )}
      {flags.slice(0, compact ? 2 : 6).map((flag) => (
        <span key={flag} className="rounded-full bg-[#f4f7fb] px-2 py-0.5 text-[11px] text-[#5b6775]">
          {FLAG_LABELS[flag] ?? flag}
        </span>
      ))}
    </div>
  );
}

function MailProviderButton({
  label,
  src,
  onClick,
  disabled,
}: {
  label: string;
  src: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e8ecf1] bg-white transition hover:border-[#c5d4e8] hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-40"
    >
      <img src={src} alt="" className="h-6 w-6 object-contain" draggable={false} />
    </button>
  );
}

export function MessagesInbox({ initialId }: { initialId: string | null }) {
  const canDelete = useCan("messages", "delete");
  const { confirm, toast } = useFeedback();
  const [messages, setMessages] = useState<Message[]>([]);
  const [openId, setOpenId] = useState<string | null>(initialId);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [forwardTo, setForwardTo] = useState("");
  const [copied, setCopied] = useState(false);
  const [listCollapsed, setListCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const marked = useRef(new Set<string>());

  useEffect(() => {
    try {
      if (localStorage.getItem(LIST_COLLAPSE_KEY) === "1") setListCollapsed(true);
    } catch {
      /* private mode */
    }
  }, []);

  function toggleListCollapsed() {
    setListCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(LIST_COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* private mode */
      }
      return next;
    });
  }

  const stats = useMemo(() => {
    const unread = messages.filter((m) => !m.read_at).length;
    const risk = messages.filter((m) => (m.risk_score ?? 0) >= 40).length;
    return { total: messages.length, unread, risk };
  }, [messages]);

  const filtered = useMemo(() => {
    const sorted = [...messages].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    let rows = sorted;
    if (filter === "unread") rows = rows.filter((m) => !m.read_at);
    if (filter === "risk") rows = rows.filter((m) => (m.risk_score ?? 0) >= 40);
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((m) => {
      const blob = `${m.subject} ${fullName(m)} ${m.email}`.toLowerCase();
      return blob.includes(q);
    });
  }, [messages, filter, search]);

  function applyFilter(key: Filter) {
    setFilter(key);
    if (listCollapsed) {
      setListCollapsed(false);
      try {
        localStorage.setItem(LIST_COLLAPSE_KEY, "0");
      } catch {
        /* private mode */
      }
    }
  }

  const load = useCallback(async () => {
    const res = await fetch("/api/messages", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setError(data.error ?? "Could not load messages.");
    else {
      setMessages(data.messages ?? []);
      setUnlocked(Boolean(data.sensitiveUnlocked));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function unlockView() {
    setUnlockError(null);
    if (!unlockPassword) {
      setUnlockError("Enter your account password.");
      return;
    }
    setUnlocking(true);
    const res = await fetch("/api/messages/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: unlockPassword }),
    });
    const data = await res.json().catch(() => ({}));
    setUnlocking(false);
    if (!res.ok) {
      setUnlockError(data.error ?? "Could not unlock messages.");
      return;
    }
    setUnlockPassword("");
    setUnlocked(true);
    toast("You can view message details for the next 15 minutes.");
    await load();
  }

  async function open(row: Message) {
    setOpenId(row.id);
    const url = new URL(window.location.href);
    url.searchParams.set("id", row.id);
    window.history.replaceState(null, "", url.pathname + url.search);
    if (!unlocked || row.read_at) return;
    const res = await fetch("/api/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id }),
    });
    if (res.ok) {
      setMessages((prev) => prev.map((item) => (item.id === row.id ? { ...item, read_at: new Date().toISOString() } : item)));
    }
  }

  useEffect(() => {
    if (!initialId || loading || marked.current.has(initialId)) return;
    const row = messages.find((item) => item.id === initialId);
    if (!row || row.read_at) return;
    marked.current.add(initialId);
    open(row);
  }, [initialId, loading, messages, unlocked]);

  async function remove(row: Message) {
    const ok = await confirm({
      title: "Delete this message?",
      message: unlocked
        ? `"${row.subject}" from ${fullName(row)} goes to the recycle bin.`
        : "This message goes to the recycle bin.",
      confirmLabel: "Delete message",
      danger: true,
    });
    if (!ok) return;
    setDeleting(true);
    const res = await fetch(`/api/messages?id=${encodeURIComponent(row.id)}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setDeleting(false);
    if (!res.ok) {
      toast(data.error ?? "Could not delete the message.", "error");
      return;
    }
    refreshNotices();
    setMessages((prev) => prev.filter((item) => item.id !== row.id));
    setOpenId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("id");
    window.history.replaceState(null, "", url.pathname + url.search);
    toast("Message moved to the recycle bin.");
  }

  const openRow = messages.find((row) => row.id === openId) ?? null;

  function composeFields(row: Message, mode: "forward" | "reply", to: string) {
    const subject = mode === "forward" ? forwardSubject(row) : replySubject(row);
    const body = mode === "forward" ? forwardPlainBody(row) : replyPlainBody(row);
    return { to, subject, body };
  }

  function openGmail(row: Message, mode: "forward" | "reply", to: string) {
    const fields = composeFields(row, mode, to);
    window.open(gmailComposeUrl(fields), "_blank", "noopener");
    toast(mode === "forward" ? "Gmail compose opened. Check To and send." : "Gmail reply opened.");
  }

  function openOutlook(row: Message, mode: "forward" | "reply", to: string) {
    const fields = composeFields(row, mode, to);
    const web = outlookWebComposeUrl(fields);
    const opened = window.open(web, "_blank", "noopener");
    if (!opened) openMailto(fields);
    else toast(mode === "forward" ? "Outlook compose opened. Check To and send." : "Outlook reply opened.");
  }

  function forwardToColleague(row: Message, provider: "gmail" | "outlook") {
    const to = forwardTo.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      toast("Enter a valid colleague email in Forward to.", "error");
      return;
    }
    if (provider === "gmail") openGmail(row, "forward", to);
    else openOutlook(row, "forward", to);
  }

  async function copyForward(row: Message) {
    try {
      await navigator.clipboard.writeText(forwardPlainBody(row));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      toast("Message copied. Paste into any email app.");
    } catch {
      toast("Could not copy.", "error");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center gap-2 text-[14px] text-[#5b6775]">
        <Loader2 className="h-5 w-5 animate-spin text-[#0b1f3a]" /> Loading inbox…
      </div>
    );
  }

  const statFor = (key: Filter) => (key === "all" ? stats.total : key === "unread" ? stats.unread : stats.risk);
  const showListOnMobile = !openId;

  return (
    <div className="space-y-3">
      {error && <Notice kind="error">{error}</Notice>}

      <div className="ksl-card overflow-hidden">
        {!unlocked && (
          <div className="border-b border-[#e8ecf1] bg-gradient-to-r from-[#f4f7fb] to-white px-3 py-3 sm:px-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0b1f3a] text-white shadow-sm">
                  <Lock className="h-3.5 w-3.5" aria-hidden />
                </div>
                <p className="text-[13px] leading-snug text-[#3d4c5f]">
                  <span className="font-semibold text-[#0b1f3a]">Protected.</span> Enter your password to read names and message text.
                </p>
              </div>
              <form
                className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto"
                onSubmit={(e) => {
                  e.preventDefault();
                  void unlockView();
                }}
              >
                <PasswordInput
                  id="messages-unlock"
                  value={unlockPassword}
                  onChange={(e) => setUnlockPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Password"
                  className="sm:min-w-[180px]"
                />
                <Button type="submit" disabled={unlocking} size="sm">
                  {unlocking ? "Checking" : "Unlock 15 min"}
                </Button>
              </form>
            </div>
            {unlockError ? (
              <div className="mt-2">
                <Notice kind="error">{unlockError}</Notice>
              </div>
            ) : null}
          </div>
        )}

        <div className="flex flex-col gap-2 border-b border-[#eef1f4] bg-[#fafbfc] px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="hidden h-8 w-8 shrink-0 p-0 lg:inline-flex"
              onClick={toggleListCollapsed}
              aria-label={listCollapsed ? "Expand message list" : "Collapse message list"}
              title={listCollapsed ? "Expand list" : "Collapse list"}
            >
              {listCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
            <p className="truncate text-[13px] text-[#5b6775]">
              <span className="font-semibold text-[#0b1f3a]">{filtered.length}</span>
              {filter === "all" ? " in inbox" : filter === "unread" ? " unread" : " flagged"}
            </p>
          </div>

          <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end" role="group" aria-label="Filter messages">
            <div className="inline-flex rounded-lg border border-[#e3e8ee] bg-[#eef2f6] p-0.5">
              {(["all", "unread", "risk"] as const).map((key) => {
                const meta = FILTER_META[key];
                const count = statFor(key);
                const active = filter === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyFilter(key)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition",
                      active ? "bg-white text-[#0b1f3a] shadow-sm" : "text-[#5b6775] hover:text-[#0b1f3a]"
                    )}
                  >
                    <span className="hidden sm:inline">{meta.label}</span>
                    <span className="sm:hidden">{meta.label.split(" ")[0]}</span>
                    <span
                      className={cn(
                        "tabular-nums text-[10px]",
                        active ? "text-[#5b6775]" : key === "risk" && count > 0 ? "text-[#9b1c1c]" : "text-[#8a96a3]"
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <label className="relative flex h-8 min-w-0 flex-1 items-center sm:max-w-[220px]">
              <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-[#8a96a3]" aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="h-8 w-full rounded-md border border-[#e3e8ee] bg-white py-0 pl-8 pr-8 text-[12px] text-[#0b1f3a] outline-none placeholder:text-[#8a96a3] focus:border-[#0b1f3a] focus:ring-2 focus:ring-[#0b1f3a]/10"
              />
              {search ? (
                <button
                  type="button"
                  className="absolute right-1.5 flex h-6 w-6 items-center justify-center rounded text-[#5b6775] hover:bg-[#eef2f6]"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              ) : null}
            </label>
          </div>
        </div>

        <div className="flex min-h-[min(72vh,640px)]">
          <aside
            className={cn(
              "flex shrink-0 flex-col border-[#eef1f4] bg-white transition-[width] duration-200 ease-out",
              listCollapsed ? "hidden w-0 lg:flex lg:w-[52px] lg:border-r" : "w-full border-b lg:w-[min(100%,300px)] lg:border-b-0 lg:border-r xl:w-[320px]",
              !showListOnMobile && "hidden lg:flex"
            )}
          >
            {listCollapsed ? (
              <nav className="hidden flex-1 flex-col gap-0.5 p-1.5 lg:flex" aria-label="Message filters">
                {(["all", "unread", "risk"] as const).map((key) => {
                  const meta = FILTER_META[key];
                  const Icon = meta.icon;
                  const count = statFor(key);
                  const active = filter === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      title={`${meta.label} (${count})`}
                      onClick={() => applyFilter(key)}
                      className={cn(
                        "relative flex h-9 w-full items-center justify-center rounded-md transition",
                        active ? "bg-[#0b1f3a] text-white" : "text-[#5b6775] hover:bg-[#f4f7fb]"
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                      {count > 0 ? (
                        <span className="absolute -right-0.5 -top-0.5 min-w-[16px] rounded-full bg-[#c5a028] px-1 text-center text-[9px] font-bold leading-4 text-[#0b1f3a]">
                          {count > 9 ? "9+" : count}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
                <button
                  type="button"
                  className="mt-auto flex h-9 w-full items-center justify-center rounded-md text-[#5b6775] hover:bg-[#f4f7fb]"
                  onClick={toggleListCollapsed}
                  aria-label="Expand message list"
                  title="Expand list"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </button>
              </nav>
            ) : (
              <>
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center px-4 py-12 text-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f0f5fb] text-[#5b6775]">
                      <Inbox className="h-5 w-5" aria-hidden />
                    </div>
                    <p className="mt-3 text-[14px] font-semibold text-[#0b1f3a]">
                      {search.trim() ? "No matches" : "Nothing here"}
                    </p>
                    <p className="mt-1 text-[12px] text-[#6b7785]">
                      {search.trim() ? "Try another search or filter." : "Change the filter to see more messages."}
                    </p>
                  </div>
                ) : (
                  <ul className="min-h-0 flex-1 overflow-y-auto">
                    {filtered.map((row) => {
                      const active = openId === row.id;
                      const unread = !row.read_at;
                      const risk = (row.risk_score ?? 0) >= 40;
                      return (
                        <li key={row.id}>
                          <button
                            type="button"
                            onClick={() => open(row)}
                            title={when(row.created_at)}
                            className={cn(
                              "group flex w-full gap-2.5 border-b border-[#f0f3f6] border-l-[3px] py-2.5 pl-2.5 pr-3 text-left transition",
                              active
                                ? "border-l-[#0b1f3a] bg-[#f0f5fb]"
                                : unread
                                  ? "border-l-[#c5a028] bg-[#fffcf5] hover:bg-[#f8fafc]"
                                  : "border-l-transparent hover:border-l-[#d5dce4] hover:bg-[#f8fafc]"
                            )}
                          >
                            <span
                              className={cn(
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ring-2 ring-white",
                                unread ? "bg-[#0b1f3a] text-white" : "bg-[#e8ecf1] text-[#5b6775]"
                              )}
                            >
                              {initials(row)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-start justify-between gap-2">
                                <span
                                  className={cn(
                                    "min-w-0 truncate text-[13px] leading-tight",
                                    unread ? "font-bold text-[#0b1f3a]" : "font-semibold text-[#3d4c5f]",
                                    !unlocked && "blur-[5px]"
                                  )}
                                >
                                  {row.subject}
                                </span>
                                <span className="shrink-0 text-[10px] font-medium tabular-nums text-[#8a96a3]">
                                  {listWhen(row.created_at)}
                                </span>
                              </span>
                              <span className={cn("mt-0.5 block truncate text-[12px] text-[#5b6775]", !unlocked && "blur-[4px]")}>
                                {fullName(row)}
                              </span>
                              {unlocked && previewText(row.message) ? (
                                <span className="mt-1 block truncate text-[11px] text-[#8a96a3]">{previewText(row.message)}</span>
                              ) : null}
                              {(risk || (row.risk_score ?? 0) > 0) && (
                                <span className="mt-1 inline-flex items-center gap-1">
                                  {risk && <ShieldAlert className="h-3 w-3 text-[#9b1c1c]" aria-hidden />}
                                  {(row.risk_score ?? 0) > 0 && (
                                    <span className="rounded bg-[#eef1f4] px-1.5 py-px text-[10px] font-semibold text-[#5b6775]">
                                      Risk {row.risk_score}
                                    </span>
                                  )}
                                </span>
                              )}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
          </aside>

          <section className="relative min-w-0 flex-1 bg-white">
          {!openRow ? (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 px-6 py-12 text-center lg:min-h-[420px]">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f0f5fb] to-[#e8ecf1]">
                <Mail className="h-7 w-7 text-[#5b6775]" aria-hidden />
              </div>
              <p className="text-[16px] font-semibold text-[#0b1f3a]">Select a message</p>
              <p className="max-w-sm text-[13px] leading-relaxed text-[#6b7785]">
                Pick a conversation on the left to read it and reply with Gmail or Outlook.
              </p>
            </div>
          ) : (
            <article className={cn("flex h-full min-h-[280px] flex-col lg:min-h-[420px]", !unlocked && "pointer-events-none")}>
              {!unlocked && (
                <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-white/85 backdrop-blur-[2px]">
                  <div className="ksl-card max-w-xs px-6 py-5 text-center shadow-md">
                    <Lock className="mx-auto h-5 w-5 text-[#0b1f3a]" aria-hidden />
                    <p className="mt-2 text-[14px] font-medium text-[#0b1f3a]">Unlock above to read and reply</p>
                  </div>
                </div>
              )}

              <header className="border-b border-[#eef1f4] bg-white px-4 py-4 sm:px-5">
                <div className="mb-3 flex items-start gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-0.5 h-8 gap-1 px-2 lg:hidden"
                    onClick={() => {
                      setOpenId(null);
                      const url = new URL(window.location.href);
                      url.searchParams.delete("id");
                      window.history.replaceState(null, "", url.pathname + url.search);
                    }}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0b1f3a] text-[13px] font-bold text-white">
                    {initials(openRow)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className={cn("text-[18px] font-bold leading-snug text-[#0b1f3a] sm:text-[20px]", !unlocked && "blur-md")}>
                      {openRow.subject}
                    </h2>
                    <p className="mt-1 text-[12px] text-[#8a96a3]">{when(openRow.created_at)}</p>
                    <RiskBadges row={openRow} />
                  </div>
                </div>

                <div className="grid gap-2 text-[13px] sm:grid-cols-2">
                  <DetailRow label="From" blurred={!unlocked}>
                    {fullName(openRow)}
                  </DetailRow>
                  <DetailRow label="Email" blurred={!unlocked}>
                    {unlocked ? (
                      <a className="text-[#0b4a8a] underline decoration-[#0b4a8a]/30 underline-offset-2" href={`mailto:${openRow.email}`}>
                        {openRow.email}
                      </a>
                    ) : (
                      openRow.email
                    )}
                  </DetailRow>
                  {openRow.preferred_contact ? (
                    <DetailRow label="Preferred contact" blurred={!unlocked}>
                      {openRow.preferred_contact}
                    </DetailRow>
                  ) : null}
                  {openRow.submitter_ip ? (
                    <DetailRow label="Suspicious sender IP" blurred={!unlocked} warn>
                      <span className="font-mono text-[12px]">{openRow.submitter_ip}</span>
                    </DetailRow>
                  ) : null}
                </div>
              </header>

              {unlocked && (
                <div className="border-b border-[#eef1f4] bg-[#fafbfc] px-4 py-3 sm:px-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={() => openGmail(openRow, "reply", openRow.email)}>
                      <Reply className="h-4 w-4" /> Gmail
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => openOutlook(openRow, "reply", openRow.email)}>
                      <Reply className="h-4 w-4" /> Outlook
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => copyForward(openRow)}>
                      {copied ? <Check className="h-4 w-4 text-[#12b76a]" /> : <Copy className="h-4 w-4" />}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-[#e3e8ee] bg-white p-2.5">
                    <Forward className="h-4 w-4 shrink-0 text-[#5b6775]" aria-hidden />
                    <input
                      type="email"
                      value={forwardTo}
                      onChange={(e) => setForwardTo(e.target.value)}
                      placeholder="Forward to colleague"
                      className="h-8 min-w-[140px] flex-1 border-0 bg-transparent px-1 text-[13px] text-[#0b1f3a] outline-none placeholder:text-[#8a96a3]"
                    />
                    <MailProviderButton
                      label="Forward with Gmail"
                      src="/brand/gmail.svg"
                      onClick={() => forwardToColleague(openRow, "gmail")}
                    />
                    <MailProviderButton
                      label="Forward with Outlook"
                      src="/brand/outlook.svg"
                      onClick={() => forwardToColleague(openRow, "outlook")}
                    />
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
                <div className="rounded-lg border border-[#eef1f4] bg-[#f8fafc] px-4 py-4 sm:px-5 sm:py-5">
                  <p className={cn("whitespace-pre-wrap text-[15px] leading-[1.65] text-[#1f2933]", !unlocked && "blur-md")}>
                    {openRow.message || (openRow.locked ? "" : "")}
                  </p>
                </div>
              </div>

              {canDelete && unlocked && (
                <footer className="border-t border-[#eef1f4] px-5 py-4">
                  <Button variant="danger" disabled={deleting} onClick={() => remove(openRow)}>
                    {deleting ? "Deleting…" : "Delete message"}
                  </Button>
                </footer>
              )}
            </article>
          )}
        </section>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  children,
  blurred,
  warn,
}: {
  label: string;
  children: ReactNode;
  blurred?: boolean;
  warn?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2",
        warn ? "border-[#f0c7c3] bg-[#fdf8f8]" : "border-[#eef1f4] bg-[#fafbfc]"
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8a96a3]">{label}</p>
      <p className={cn("mt-0.5 text-[13px] font-medium text-[#1f2933]", blurred && "blur-sm")}>{children}</p>
    </div>
  );
}
