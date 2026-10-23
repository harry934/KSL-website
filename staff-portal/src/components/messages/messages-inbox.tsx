"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useCan } from "@/components/portal/session-context";
import { Button } from "@/components/ui/button";
import { useFeedback } from "@/components/ui/feedback";
import { Notice } from "@/components/ui/form-bits";
import { RecycleBin } from "@/components/portal/recycle-bin";
import { cn } from "@/lib/cn";

type Message = {
  id: string;
  first_name: string;
  other_name: string | null;
  surname: string;
  email: string;
  subject: string;
  message: string;
  preferred_contact: string | null;
  created_at: string;
  read_at: string | null;
  deleted_at?: string | null;
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

export function MessagesInbox({ initialId }: { initialId: string | null }) {
  const canDelete = useCan("messages", "delete");
  const { confirm, toast } = useFeedback();
  const [messages, setMessages] = useState<Message[]>([]);
  const [removed, setRemoved] = useState<Message[]>([]);
  const [openId, setOpenId] = useState<string | null>(initialId);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const marked = useRef(new Set<string>());

  const load = useCallback(async () => {
    const res = await fetch("/api/messages", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setError(data.error ?? "Could not load messages.");
    else {
      setMessages(data.messages ?? []);
      setRemoved(data.removed ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function open(row: Message) {
    setOpenId(row.id);
    const url = new URL(window.location.href);
    url.searchParams.set("id", row.id);
    window.history.replaceState(null, "", url.pathname + url.search);
    if (row.read_at) return;
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
  }, [initialId, loading, messages]);

  async function remove(row: Message) {
    const ok = await confirm({
      title: "Delete this message?",
      message: `"${row.subject}" from ${fullName(row)} goes to the recycle bin.`,
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
    setMessages((prev) => prev.filter((item) => item.id !== row.id));
    setOpenId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("id");
    window.history.replaceState(null, "", url.pathname + url.search);
    toast("Message moved to the recycle bin.");
  }

  const openRow = messages.find((row) => row.id === openId) ?? null;

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
      <div className="ksl-card overflow-hidden">
        {messages.length === 0 && <p className="px-4 py-8 text-center text-[14px] text-[#6b7785]">No messages yet.</p>}
        <ul>
          {messages.map((row) => (
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
                  <span className="truncate text-[14px] font-semibold text-[#0b1f3a]">{row.subject}</span>
                </span>
                <span className="truncate text-[13px] text-[#5b6775]">{fullName(row)}</span>
                <span className="text-[12px] text-[#6b7785]">{when(row.created_at)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <section className="ksl-card p-5">
        {!openRow && <p className="text-[14px] text-[#6b7785]">Choose a message to read it.</p>}
        {openRow && (
          <article>
            <p className="text-[12.5px] font-semibold uppercase tracking-wide text-[#6b7785]">{when(openRow.created_at)}</p>
            <h2 className="mt-1 text-[20px] font-bold text-[#0b1f3a]">{openRow.subject}</h2>
            <p className="mt-2 text-[14px] text-[#1f2933]">
              {fullName(openRow)} · <a className="underline" href={`mailto:${openRow.email}`}>{openRow.email}</a>
            </p>
            {openRow.preferred_contact && (
              <p className="mt-1 text-[13.5px] text-[#5b6775]">Preferred contact: {openRow.preferred_contact}</p>
            )}
            <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-[#1f2933]">{openRow.message}</p>
            {canDelete && (
              <div className="mt-6 border-t border-[#eef1f4] pt-4">
                <Button variant="danger" disabled={deleting} onClick={() => remove(openRow)}>
                  {deleting ? "Deleting…" : "Delete message"}
                </Button>
              </div>
            )}
          </article>
        )}
      </section>
      <div className="lg:col-span-2">
        <RecycleBin
          items={removed.map((row) => ({ id: row.id, title: `${row.subject} — ${fullName(row)}` }))}
          onRestore={(id) => {
            fetch("/api/messages", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "restore", id }),
            })
              .then(async (res) => {
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.error ?? "Could not restore the message.");
                toast("Message restored.");
                load();
              })
              .catch((err) => toast((err as Error).message, "error"));
          }}
          onDelete={(id) => {
            fetch(`/api/messages?id=${encodeURIComponent(id)}&permanent=1`, { method: "DELETE" })
              .then(async (res) => {
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.error ?? "Could not delete the message.");
                toast("Message deleted.");
                load();
              })
              .catch((err) => toast((err as Error).message, "error"));
          }}
        />
      </div>
    </div>
  );
}
