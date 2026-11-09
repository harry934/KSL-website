"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Lock, ShieldAlert } from "lucide-react";
import { useCan } from "@/components/portal/session-context";
import { Button } from "@/components/ui/button";
import { useFeedback } from "@/components/ui/feedback";
import { Notice } from "@/components/ui/form-bits";
import { PasswordInput } from "@/components/ui/password-input";
import { cn } from "@/lib/cn";
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

function RiskBadges({ row }: { row: Message }) {
  const score = row.risk_score ?? 0;
  const flags = row.risk_flags ?? [];
  if (!score && !flags.length) return null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5">
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
      {flags.slice(0, 4).map((flag) => (
        <span key={flag} className="rounded-full bg-[#f4f7fb] px-2 py-0.5 text-[11px] text-[#5b6775]">
          {FLAG_LABELS[flag] ?? flag}
        </span>
      ))}
    </div>
  );
}

export function MessagesInbox({ initialId }: { initialId: string | null }) {
  const canDelete = useCan("messages", "delete");
  const { confirm, toast } = useFeedback();
  const [messages, setMessages] = useState<Message[]>([]);
  const [openId, setOpenId] = useState<string | null>(initialId);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const marked = useRef(new Set<string>());

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
  const sorted = [...messages].sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0));

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[14px] text-[#5b6775]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading messages…
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(260px,360px)_1fr]">
      {error && <Notice kind="error">{error}</Notice>}

      {!unlocked && (
        <div className="ksl-card flex flex-col gap-3 p-4 lg:col-span-2">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-[#0b1f3a]/10 p-2 text-[#0b1f3a]">
              <Lock className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-semibold text-[#0b1f3a]">Message details are hidden</h2>
              <p className="mt-1 text-[13.5px] leading-relaxed text-[#5b6775]">
                Names, email, message text, and IP stay blurred until you enter your account password. Risk scores still show so you
                can spot suspicious submissions first.
              </p>
              <form
                className="mt-3 flex max-w-md flex-col gap-2 sm:flex-row sm:items-end"
                onSubmit={(e) => {
                  e.preventDefault();
                  void unlockView();
                }}
              >
                <div className="min-w-0 flex-1">
                  <PasswordInput
                    id="messages-unlock"
                    value={unlockPassword}
                    onChange={(e) => setUnlockPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="Your account password"
                  />
                </div>
                <Button type="submit" disabled={unlocking}>
                  {unlocking ? "Checking…" : "Unlock for 15 min"}
                </Button>
              </form>
              {unlockError && (
                <div className="mt-2">
                  <Notice kind="error">{unlockError}</Notice>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="ksl-card overflow-hidden">
        {messages.length === 0 && <p className="px-4 py-8 text-center text-[14px] text-[#6b7785]">No messages yet.</p>}
        <ul>
          {sorted.map((row) => (
            <li key={row.id} className="border-b border-[#eef1f4] last:border-b-0">
              <button
                type="button"
                onClick={() => open(row)}
                className={cn(
                  "flex w-full flex-col gap-0.5 px-4 py-3 text-left hover:bg-[#f6f8fa]",
                  openId === row.id && "bg-[#f4f7fb]"
                )}
              >
                <span className="flex items-center gap-2">
                  {!row.read_at && <span className="h-2 w-2 shrink-0 rounded-full bg-[#0b1f3a]" aria-label="Unread" />}
                  {(row.risk_score ?? 0) >= 40 && <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-[#9b1c1c]" aria-hidden />}
                  <span
                    className={cn(
                      "truncate text-[14px] font-semibold text-[#0b1f3a]",
                      !unlocked && "select-none blur-[6px]"
                    )}
                  >
                    {row.subject}
                  </span>
                </span>
                <span className={cn("truncate text-[13px] text-[#5b6775]", !unlocked && "select-none blur-[5px]")}>
                  {fullName(row)}
                </span>
                <RiskBadges row={row} />
                <span className="text-[12px] text-[#6b7785]">{when(row.created_at)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <section className="ksl-card relative p-5">
        {!openRow && <p className="text-[14px] text-[#6b7785]">Choose a message to read it.</p>}
        {openRow && (
          <article className={cn(!unlocked && "pointer-events-none")}>
            {!unlocked && (
              <div className="pointer-events-auto absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-white/75 backdrop-blur-md">
                <p className="max-w-xs px-6 text-center text-[14px] font-medium text-[#0b1f3a]">
                  Enter your password above to view this message.
                </p>
              </div>
            )}
            <p className="text-[12.5px] font-semibold uppercase tracking-wide text-[#6b7785]">{when(openRow.created_at)}</p>
            <RiskBadges row={openRow} />
            <h2 className={cn("mt-2 text-[20px] font-bold text-[#0b1f3a]", !unlocked && "select-none blur-md")}>
              {openRow.subject}
            </h2>
            <p className={cn("mt-2 text-[14px] text-[#1f2933]", !unlocked && "select-none blur-md")}>
              {fullName(openRow)} ·{" "}
              {unlocked ? (
                <a className="underline" href={`mailto:${openRow.email}`}>
                  {openRow.email}
                </a>
              ) : (
                <span>{openRow.email}</span>
              )}
            </p>
            {openRow.preferred_contact && (
              <p className={cn("mt-1 text-[13.5px] text-[#5b6775]", !unlocked && "select-none blur-md")}>
                Preferred contact: {openRow.preferred_contact}
              </p>
            )}
            {openRow.submitter_ip ? (
              <p className={cn("mt-1 text-[13px] text-[#6b7785]", !unlocked && "select-none blur-md")}>
                Submitted from IP: <span className="font-mono text-[12.5px]">{openRow.submitter_ip}</span>
              </p>
            ) : (
              !openRow.locked && <p className="mt-1 text-[13px] text-[#8a96a3]">Submitter IP not recorded.</p>
            )}
            <p className={cn("mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-[#1f2933]", !unlocked && "select-none blur-md")}>
              {openRow.message || (openRow.locked ? "—" : "")}
            </p>
            {canDelete && unlocked && (
              <NeedsDeleteRow deleting={deleting} onDelete={() => remove(openRow)} />
            )}
          </article>
        )}
      </section>
    </div>
  );
}

function NeedsDeleteRow({ deleting, onDelete }: { deleting: boolean; onDelete: () => void }) {
  return (
    <div className="pointer-events-auto mt-6 border-t border-[#eef1f4] pt-4">
      <Button variant="danger" disabled={deleting} onClick={onDelete}>
        {deleting ? "Deleting…" : "Delete message"}
      </Button>
    </div>
  );
}
