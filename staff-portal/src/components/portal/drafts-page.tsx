"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/portal/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState, Notice } from "@/components/ui/form-bits";
import { useFeedback } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
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

export function useDraftCount(enabled: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let stop = false;
    fetch("/api/drafts", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!stop && data) setCount(Array.isArray(data.items) ? data.items.length : 0);
      })
      .catch(() => {});
    return () => {
      stop = true;
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
  const { toast, confirm } = useFeedback();
  const [items, setItems] = useState<ReviewDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [returning, setReturning] = useState<string | null>(null);
  const [reason, setReason] = useState("");

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

  async function discard(item: ReviewDraft) {
    if (!item.discardId) return;
    const ok = await confirm({
      title: "Discard these changes?",
      message: `"${item.title}" stays as it is on the website. The saved changes are removed.`,
      confirmLabel: "Discard changes",
      danger: true,
    });
    if (!ok) return;
    try {
      await sendJson(`/api/drafts?id=${encodeURIComponent(item.discardId)}`, "DELETE");
      toast("Those changes were discarded.");
      setReturning(null);
      load();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  async function sendBack(item: ReviewDraft) {
    const note = reason.trim();
    if (!note) {
      toast("Write a short reason.", "error");
      return;
    }
    try {
      await sendJson("/api/drafts", "POST", {
        table: item.table,
        entityId: item.entityId,
        entityKey: item.entityKey,
        note,
      });
      toast(`Sent back to ${item.author}.`);
      setReturning(null);
      setReason("");
      load();
    } catch (err) {
      toast((err as Error).message, "error");
    }
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
    return <EmptyState>Nothing is waiting. A hidden page, or a change that is not on the website yet, will show up here.</EmptyState>;
  }

  return (
    <div>
      <ul className="divide-y divide-[#eef1f4] overflow-hidden rounded-[10px] border border-[#e3e8ee] bg-white">
        {shown.map((item) => (
          <li key={item.id} className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-[200px] flex-1">
                <p className="text-[14px] font-semibold text-[#0b1f3a]">{item.title}</p>
                <p className="mt-0.5 text-[12.5px] text-[#6b7785]">
                  {item.section} · {item.author}
                  {item.updatedAt ? ` · ${formatWhen(item.updatedAt)}` : ""}
                </p>
                <p className="mt-1 text-[12.5px] text-[#5b6775]">{item.note}</p>
              </div>
              <div className="flex items-center gap-2">
                <Link href={item.href} className="inline-flex h-9 items-center rounded-[6px] bg-[#0b1f3a] px-3 text-[13px] font-semibold text-white hover:no-underline">
                  Open
                </Link>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setReturning((current) => (current === item.id ? null : item.id));
                    setReason("");
                  }}
                >
                  Send back
                </Button>
                {item.discardId ? (
                  <Button variant="secondary" onClick={() => discard(item)}>
                    Discard
                  </Button>
                ) : null}
              </div>
            </div>
            {returning === item.id ? (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  value={reason}
                  maxLength={300}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Reason to send back"
                  aria-label={`Reason for ${item.title}`}
                />
                <Button onClick={() => sendBack(item)}>Send</Button>
              </div>
            ) : null}
          </li>
        ))}
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
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    let stop = false;
    fetch("/api/drafts", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!stop && data?.items) setHasChanges(data.items.some((item: ReviewDraft) => item.kind === "change"));
      })
      .catch(() => {});
    return () => {
      stop = true;
    };
  }, []);

  return (
    <>
      <PageHeader
        title="Drafts"
        description="Pages that are hidden, and changes that are not on the website yet. Open one, check it, then turn on Show on website. Send it back with a reason if it needs another look."
      />
      <DraftQueue />
      {hasChanges ? (
        <Notice kind="info">
          Changes to something already on the website do not replace the live page until you open the draft and save it with Show on website switched on.
        </Notice>
      ) : null}
    </>
  );
}
