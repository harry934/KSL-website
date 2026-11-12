"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/portal/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/form-bits";
import { useFeedback } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import { NOTICES_REFRESH } from "@/lib/notification-seen";
import { sendJson } from "@/lib/upload-client";

type ReviewDraft = {
  id: string;
  kind: "new" | "change";
  title: string;
  section: string;
  href: string;
  author: string;
  updatedAt: string | null;
  discardId: string | null;
  note: string;
  table: string;
  entityId: string | null;
  entityKey: string;
};

type ReturnedDraft = {
  id: string;
  title: string;
  section: string;
  href: string;
  note: string;
  reviewer: string;
  createdAt: string;
};

type DraftChange = { label: string; before: string; after: string };

export function useDraftCount(enabled: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let stop = false;
    function load() {
      fetch("/api/drafts", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!stop && data) setCount(Array.isArray(data.items) ? data.items.length : 0);
        })
        .catch(() => {});
    }
    load();
    window.addEventListener(NOTICES_REFRESH, load);
    return () => {
      stop = true;
      window.removeEventListener(NOTICES_REFRESH, load);
    };
  }, [enabled]);

  return count;
}

function formatWhen(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Nairobi",
  }).format(date);
}

export function ReturnedNotes() {
  const [items, setItems] = useState<ReturnedDraft[]>([]);

  useEffect(() => {
    let stop = false;
    fetch("/api/drafts", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!stop && data) setItems(Array.isArray(data.returned) ? data.returned : []);
      })
      .catch(() => {});
    return () => {
      stop = true;
    };
  }, []);

  if (!items.length) return null;

  return (
    <section aria-label="Sent back to you">
      <h2 className="mb-2.5 text-[13px] font-semibold text-[#5b6775]">Sent back to you</h2>
      <ul className="divide-y divide-[#eef1f4] overflow-hidden rounded-[10px] border border-[#f0d3a8] bg-[#fff8f1]">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-[200px] flex-1">
              <p className="text-[14px] font-semibold text-[#0b1f3a]">{item.title}</p>
              <p className="mt-0.5 text-[12.5px] text-[#6b7785]">
                {item.section} · {item.reviewer}
                {item.createdAt ? ` · ${formatWhen(item.createdAt)}` : ""}
              </p>
              <p className="mt-1 text-[13px] text-[#7c4a12]">{item.note}</p>
            </div>
            <Link href={item.href} className="inline-flex h-9 items-center rounded-[6px] bg-[#0b1f3a] px-3 text-[13px] font-semibold text-white hover:no-underline">
              Open
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DraftQueue({ limit }: { limit?: number }) {
  const { toast } = useFeedback();
  const [items, setItems] = useState<ReviewDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [changes, setChanges] = useState<Record<string, DraftChange[]>>({});
  const [opening, setOpening] = useState<string | null>(null);
  const [declining, setDeclining] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await sendJson("/api/drafts", "GET");
      setItems(data.items ?? []);
    } catch (err) {
      toast((err as Error).message, "error");
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function openChanges(item: ReviewDraft) {
    if (openId === item.id) {
      setOpenId(null);
      return;
    }
    setOpenId(item.id);
    setDeclining(null);
    if (changes[item.id]) return;
    setOpening(item.id);
    try {
      const params = new URLSearchParams({ preview: "1", table: item.table, entityKey: item.entityKey });
      if (item.entityId) params.set("entityId", item.entityId);
      const data = await sendJson(`/api/drafts?${params}`, "GET");
      setChanges((current) => ({ ...current, [item.id]: data.changes ?? [] }));
    } catch (err) {
      toast((err as Error).message, "error");
      setOpenId(null);
    }
    setOpening(null);
  }

  async function accept(item: ReviewDraft) {
    setBusyId(item.id);
    try {
      await sendJson("/api/drafts", "POST", {
        action: "accept",
        table: item.table,
        entityId: item.entityId,
        entityKey: item.entityKey,
      });
      toast("Accepted. It is on the website.");
      setOpenId(null);
      setDeclining(null);
      load();
    } catch (err) {
      toast((err as Error).message, "error");
    }
    setBusyId(null);
  }

  async function decline(item: ReviewDraft) {
    const note = reason.trim();
    if (!note) {
      toast("Write a short reason.", "error");
      return;
    }
    setBusyId(item.id);
    try {
      await sendJson("/api/drafts", "POST", {
        action: "decline",
        table: item.table,
        entityId: item.entityId,
        entityKey: item.entityKey,
        note,
      });
      toast(`Declined and sent back to ${item.author}.`);
      setDeclining(null);
      setReason("");
      setOpenId(null);
      load();
    } catch (err) {
      toast((err as Error).message, "error");
    }
    setBusyId(null);
  }

  const shown = typeof limit === "number" ? items.slice(0, limit) : items;
  const more = typeof limit === "number" ? Math.max(0, items.length - shown.length) : 0;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[14px] text-[#5b6775]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading drafts…
      </div>
    );
  }

  if (!items.length) {
    return <EmptyState>Nothing is waiting for review.</EmptyState>;
  }

  return (
    <div>
      <ul className="divide-y divide-[#eef1f4] overflow-hidden rounded-[10px] border border-[#e3e8ee] bg-white">
        {shown.map((item) => {
          const busy = busyId === item.id;
          return (
            <li key={item.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-[200px] flex-1">
                  <p className="text-[14px] font-semibold text-[#0b1f3a]">{item.title}</p>
                  <p className="mt-0.5 text-[12.5px] text-[#6b7785]">
                    {item.section} · {item.author}
                    {item.updatedAt ? ` · ${formatWhen(item.updatedAt)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" disabled={busy} onClick={() => openChanges(item)}>
                    {openId === item.id ? "Close" : "Open"}
                  </Button>
                  <Button disabled={busy} onClick={() => accept(item)}>
                    Accept
                  </Button>
                  <Button
                    variant="danger"
                    disabled={busy}
                    onClick={() => {
                      setDeclining((current) => (current === item.id ? null : item.id));
                      setReason("");
                      setOpenId(null);
                    }}
                  >
                    Decline
                  </Button>
                </div>
              </div>
              {openId === item.id ? (
                <div className="mt-3 rounded-[8px] border border-[#e3e8ee] bg-[#f8fafc] px-3 py-2">
                  {opening === item.id ? (
                    <p className="flex items-center gap-2 py-2 text-[13px] text-[#6b7785]">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading the changes…
                    </p>
                  ) : (
                    <ul className="divide-y divide-[#e7edf3]">
                      {(changes[item.id] ?? []).map((change) => (
                        <li key={change.label} className="py-2">
                          <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6b7785]">{change.label}</p>
                          {change.before !== "—" ? (
                            <p className="mt-1 text-[13px] text-[#8b95a1] line-through">{change.before}</p>
                          ) : null}
                          <p className="mt-1 text-[13.5px] text-[#0b1f3a]">{change.after}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
              {declining === item.id ? (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    value={reason}
                    maxLength={300}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Reason for declining"
                    aria-label={`Reason for declining ${item.title}`}
                  />
                  <Button variant="danger" disabled={busy} onClick={() => decline(item)}>
                    Decline
                  </Button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {more > 0 ? (
        <p className="mt-2 text-[13px]">
          <Link href="/drafts" className="font-semibold text-[#0b1f3a]">
            {more} more in Drafts
          </Link>
        </p>
      ) : null}
    </div>
  );
}

export function DraftsPage() {
  return (
    <>
      <PageHeader
        title="Drafts"
        description="Accept to put it on the website, or decline with a reason. Open a draft to see what changed."
      />
      <DraftQueue />
    </>
  );
}
