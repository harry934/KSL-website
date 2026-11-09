"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Check,
  Copy,
  Forward,
  Inbox,
  Loader2,
  Lock,
  Mail,
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

const FLAG_LABELS: Record<string, string> = {
  suspicious_name: "Suspicious name",
  link_in_name: "Link in name",
  name_has_numbers: "Numbers in name",
  all_caps_name: "All-caps name",
  unusual_name_characters: "Unusual name",
  disposable_email: "Disposable email",
  long_email: "Long email",
  injection_pattern: "Code like text",
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
  const marked = useRef(new Set<string>());

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
        <Loader2 className="h-5 w-5 animate-spin text-[#0078d4]" /> Loading mail
      </div>
    );
  }

  const folderLabels: Record<Filter, string> = { all: "Inbox", unread: "Unread", risk: "Suspicious" };

  return (
    <div className="overflow-hidden rounded-md border border-[#edebe9] bg-[#f3f2f1] shadow-sm">
      {error && (
        <div className="border-b border-[#edebe9] bg-white px-4 py-2">
          <Notice kind="error">{error}</Notice>
        </div>
      )}

      <div className="flex items-center justify-between bg-[#0078d4] px-4 py-2.5 text-white">
        <p className="text-[15px] font-semibold">Mail</p>
        <p className="text-[12px] text-white/90">
          {stats.unread} unread · {stats.total} total
        </p>
      </div>

      {!unlocked && (
        <div className="border-b border-[#edebe9] bg-[#fff4ce] px-4 py-3">
          <div className="flex flex-wrap items-end gap-3">
            <Lock className="h-5 w-5 shrink-0 text-[#8a6116]" aria-hidden />
            <p className="min-w-[200px] flex-1 text-[13px] text-[#323130]">
              Unlock to read names and message text. Suspicious script attempts may show a sender IP after unlock.
            </p>
            <form
              className="flex flex-wrap items-end gap-2"
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
                className="min-w-[180px]"
              />
              <Button type="submit" disabled={unlocking} variant="secondary" size="sm">
                {unlocking ? "Checking" : "Unlock 15 minutes"}
              </Button>
            </form>
          </div>
          {unlockError && (
            <div className="mt-2">
              <Notice kind="error">{unlockError}</Notice>
            </div>
          )}
        </div>
      )}

      <div className="flex min-h-[min(72vh,680px)] flex-col lg:flex-row">
        <nav className="w-full shrink-0 border-b border-[#edebe9] bg-white lg:w-44 lg:border-b-0 lg:border-r">
          <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#605e5c]">Folders</p>
          {(["all", "unread", "risk"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "flex w-full items-center justify-between px-3 py-2.5 text-left text-[13px]",
                filter === key ? "bg-[#deecf9] font-semibold text-[#0078d4]" : "text-[#323130] hover:bg-[#f3f2f1]"
              )}
            >
              <span className="flex items-center gap-2">
                {key === "all" && <Inbox className="h-4 w-4" />}
                {key === "risk" && <ShieldAlert className="h-4 w-4" />}
                {folderLabels[key]}
              </span>
              <span className="text-[12px] text-[#605e5c]">
                {key === "all" ? stats.total : key === "unread" ? stats.unread : stats.risk}
              </span>
            </button>
          ))}
        </nav>

        <div className="flex min-h-0 flex-1 flex-col border-[#edebe9] bg-white lg:max-w-md lg:border-r">
          {filtered.length === 0 ? (
            <p className="px-4 py-16 text-center text-[13px] text-[#605e5c]">No messages here.</p>
          ) : (
            <ul className="max-h-[min(72vh,680px)] overflow-y-auto">
              {filtered.map((row) => {
                const active = openId === row.id;
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => open(row)}
                      className={cn(
                        "w-full border-b border-[#edebe9] px-3 py-2.5 text-left transition",
                        active ? "border-l-[3px] border-l-[#0078d4] bg-[#deecf9] pl-[9px]" : "border-l-[3px] border-l-transparent hover:bg-[#f3f2f1]"
                      )}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={cn("min-w-0 truncate text-[13px] font-semibold text-[#323130]", !unlocked && "blur-[4px]")}>
                          {!row.read_at && <span className="mr-1 text-[#0078d4]">•</span>}
                          {row.subject}
                        </span>
                        <span className="shrink-0 text-[11px] text-[#605e5c]">{when(row.created_at)}</span>
                      </div>
                      <p className={cn("mt-0.5 truncate text-[12px] text-[#605e5c]", !unlocked && "blur-[3px]")}>{fullName(row)}</p>
                      <RiskBadges row={row} compact />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <section className="relative min-h-[320px] min-w-0 flex-1 bg-white">
          {!openRow ? (
            <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-2 px-6 text-center">
              <Mail className="h-10 w-10 text-[#c5d4e8]" aria-hidden />
              <p className="text-[15px] font-semibold text-[#0b1f3a]">Select a message</p>
              <p className="max-w-sm text-[13px] text-[#6b7785]">Choose an item from the list to read it, reply, or forward to Outlook or Gmail.</p>
            </div>
          ) : (
            <article className={cn("flex h-full flex-col", !unlocked && "pointer-events-none")}>
              {!unlocked && (
                <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-sm">
                  <p className="max-w-xs px-6 text-center text-[14px] font-medium text-[#0b1f3a]">Unlock above to read and forward this message.</p>
                </div>
              )}

              <header className="border-b border-[#eef1f4] bg-[#fafbfc] px-5 py-4">
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
                    {deleting ? "Deleting" : "Delete message"}
                  </Button>
                </footer>
              )}
            </article>
          )}
        </section>
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
