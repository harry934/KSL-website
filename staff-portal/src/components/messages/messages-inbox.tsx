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
  ShieldAlert,
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
      className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#e8ecf1] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
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
    const sorted = [...messages].sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0));
    if (filter === "unread") return sorted.filter((m) => !m.read_at);
    if (filter === "risk") return sorted.filter((m) => (m.risk_score ?? 0) >= 40);
    return sorted;
  }, [messages, filter]);

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

      {!unlocked && (
        <div className="ksl-card flex flex-col gap-3 p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0b1f3a] text-white">
              <Lock className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-[#0b1f3a]">Protected inbox</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-[#5b6775]">
                Unlock with your password to read details. Risk badges stay visible.
              </p>
            </div>
          </div>
          <form
            className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:min-w-[280px] sm:flex-row sm:items-end"
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
              className="sm:min-w-[160px]"
            />
            <Button type="submit" disabled={unlocking} size="sm">
              {unlocking ? "Checking" : "Unlock"}
            </Button>
          </form>
          </div>
          {unlockError ? <Notice kind="error">{unlockError}</Notice> : null}
        </div>
      )}

      <div className="ksl-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#eef1f4] bg-[#fafbfc] px-2 py-2 sm:px-3">
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
          <p className="text-[13px] font-semibold text-[#0b1f3a]">Messages</p>
          <div className="flex flex-wrap items-center gap-1.5 sm:ml-1">
            {(["all", "unread", "risk"] as const).map((key) => {
              const meta = FILTER_META[key];
              const Icon = meta.icon;
              const count = statFor(key);
              const active = filter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold transition",
                    active
                      ? "border-[#0b1f3a] bg-[#0b1f3a] text-white"
                      : "border-[#e3e8ee] bg-white text-[#5b6775] hover:border-[#c5d4e8] hover:bg-[#f8fafc]"
                  )}
                >
                  <Icon className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
                  <span className="hidden sm:inline">{meta.label}</span>
                  <span
                    className={cn(
                      "tabular-nums",
                      !active && key === "risk" && count > 0 && "text-[#9b1c1c]",
                      !active && key === "unread" && count > 0 && "text-[#0b1f3a]"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
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
                      onClick={() => setFilter(key)}
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
                  <p className="px-3 py-10 text-center text-[13px] text-[#6b7785]">No messages in this view.</p>
                ) : (
                  <ul className="min-h-0 flex-1 overflow-y-auto">
                    {filtered.map((row) => {
                      const active = openId === row.id;
                      return (
                        <li key={row.id}>
                          <button
                            type="button"
                            onClick={() => open(row)}
                            className={cn(
                              "flex w-full gap-2.5 border-b border-[#f0f3f6] px-3 py-2.5 text-left transition",
                              active ? "bg-[#f0f5fb] ring-1 ring-inset ring-[#c5d4e8]" : "hover:bg-[#f8fafc]"
                            )}
                          >
                            <span
                              className={cn(
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                                !row.read_at ? "bg-[#0b1f3a] text-white" : "bg-[#e8ecf1] text-[#5b6775]"
                              )}
                            >
                              {initials(row)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-1">
                                {!row.read_at && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a028]" aria-hidden />}
                                {(row.risk_score ?? 0) >= 40 && <ShieldAlert className="h-3 w-3 shrink-0 text-[#9b1c1c]" />}
                                <span className={cn("truncate text-[13px] font-semibold text-[#0b1f3a]", !unlocked && "blur-[5px]")}>
                                  {row.subject}
                                </span>
                              </span>
                              <span className={cn("mt-0.5 block truncate text-[12px] text-[#5b6775]", !unlocked && "blur-[4px]")}>
                                {fullName(row)}
                              </span>
                              <span className="mt-0.5 block text-[10px] text-[#8a96a3]">{when(row.created_at)}</span>
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
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-2 px-6 py-12 text-center lg:min-h-[420px]">
              <Mail className="h-10 w-10 text-[#c5d4e8]" aria-hidden />
              <p className="text-[15px] font-semibold text-[#0b1f3a]">Select a message</p>
              <p className="max-w-sm text-[13px] text-[#6b7785]">Choose an item from the list to read it, reply, or forward to Outlook or Gmail.</p>
            </div>
          ) : (
            <article className={cn("flex h-full min-h-[280px] flex-col lg:min-h-[420px]", !unlocked && "pointer-events-none")}>
              {!unlocked && (
                <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-sm">
                  <p className="max-w-xs px-6 text-center text-[14px] font-medium text-[#0b1f3a]">Unlock above to read and forward this message.</p>
                </div>
              )}

              <header className="border-b border-[#eef1f4] bg-[#fafbfc] px-4 py-3 sm:px-5 sm:py-4">
                <div className="mb-2 flex items-center gap-2 lg:hidden">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 px-2"
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
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8a96a3]">{when(openRow.created_at)}</p>
                <h2 className={cn("mt-1 text-[22px] font-bold leading-snug text-[#0b1f3a]", !unlocked && "blur-md")}>
                  {openRow.subject}
                </h2>
                <RiskBadges row={openRow} />
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <Meta label="From" blurred={!unlocked}>
                    {fullName(openRow)}
                  </Meta>
                  <Meta label="Email" blurred={!unlocked}>
                    {unlocked ? (
                      <a className="text-[#0b4a8a] underline" href={`mailto:${openRow.email}`}>
                        {openRow.email}
                      </a>
                    ) : (
                      openRow.email
                    )}
                  </Meta>
                  {openRow.preferred_contact && (
                    <Meta label="Preferred" blurred={!unlocked}>
                      {openRow.preferred_contact}
                    </Meta>
                  )}
                  {openRow.submitter_ip && (
                    <Meta label="Suspicious sender IP" blurred={!unlocked}>
                      <span className="font-mono text-[12px]">{openRow.submitter_ip}</span>
                    </Meta>
                  )}
                </div>
              </header>

              {unlocked && (
                <div className="border-b border-[#eef1f4] bg-white px-5 py-4">
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6b7785]">Send via email</p>
                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <Button variant="secondary" size="sm" onClick={() => openGmail(openRow, "reply", openRow.email)}>
                      <Reply className="h-4 w-4" /> Reply (Gmail)
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => openOutlook(openRow, "reply", openRow.email)}>
                      <Reply className="h-4 w-4" /> Reply (Outlook)
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => copyForward(openRow)}>
                      {copied ? <Check className="h-4 w-4 text-[#12b76a]" /> : <Copy className="h-4 w-4" />}
                      {copied ? "Copied" : "Copy text"}
                    </Button>
                  </div>
                  <div className="mt-4 rounded-lg border border-dashed border-[#d5dce4] bg-[#f8fafc] p-3">
                    <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[#0b1f3a]">
                      <Forward className="h-3.5 w-3.5" /> Forward to a colleague
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <input
                        type="email"
                        value={forwardTo}
                        onChange={(e) => setForwardTo(e.target.value)}
                        placeholder="colleague@company.com"
                        className="h-9 min-w-[200px] flex-1 rounded-md border border-[#d5dce4] px-3 text-[13px] outline-none focus:border-[#0b1f3a] focus:ring-2 focus:ring-[#0b1f3a]/15"
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
                </div>
              )}

              <div className="flex-1 overflow-y-auto px-5 py-5">
                <p className={cn("whitespace-pre-wrap text-[15px] leading-relaxed text-[#1f2933]", !unlocked && "blur-md")}>
                  {openRow.message || (openRow.locked ? "" : "")}
                </p>
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

function Meta({ label, children, blurred }: { label: string; children: ReactNode; blurred?: boolean }) {
  return (
    <div className="rounded-lg border border-[#eef1f4] bg-white px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8a96a3]">{label}</p>
      <p className={cn("mt-0.5 text-[13px] font-medium text-[#1f2933]", blurred && "blur-sm")}>{children}</p>
    </div>
  );
}
