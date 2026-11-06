"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/portal/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState, Notice } from "@/components/ui/form-bits";
import { useFeedback } from "@/components/ui/feedback";
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

export function DraftsPage() {
  const { toast, confirm } = useFeedback();
  const [items, setItems] = useState<ReviewDraft[]>([]);
  const [loading, setLoading] = useState(true);

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
      load();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  return (
    <>
      <PageHeader
        title="Drafts"
        description="Work saved by staff who can change a section but cannot publish it. Open a draft, check it, then turn on Show on website."
      />
      {loading ? (
        <div className="flex items-center gap-2 text-[14px] text-[#5b6775]">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading drafts…
        </div>
      ) : items.length === 0 ? (
        <EmptyState>No drafts are waiting. When someone without publish rights saves, it will show up here.</EmptyState>
      ) : (
        <ul className="divide-y divide-[#eef1f4] overflow-hidden rounded-[10px] border border-[#e3e8ee] bg-white">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
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
                {item.discardId ? (
                  <Button variant="secondary" onClick={() => discard(item)}>
                    Discard
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      {!loading && items.some((item) => item.kind === "change") ? (
        <div className="mt-4">
          <Notice kind="info">
            Changes to something already on the website do not replace the live page until you open the draft and save it with Show on website switched on.
          </Notice>
        </div>
      ) : null}
    </>
  );
}
