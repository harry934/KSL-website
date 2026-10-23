"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/portal/page-header";
import { Notice } from "@/components/ui/form-bits";
import { useFeedback } from "@/components/ui/feedback";
import { sendJson } from "@/lib/upload-client";

type BinItem = {
  id: string;
  title: string;
  section: string;
  table: string;
  deletedAt: string;
  canRestore: boolean;
  canDelete: boolean;
};

function formatWhen(iso: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Nairobi",
  }).format(date);
}

export function RecyclePage() {
  const { toast, confirm } = useFeedback();
  const [items, setItems] = useState<BinItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await sendJson("/api/recycle", "GET");
      setItems(data.items ?? []);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function restore(item: BinItem) {
    setBusy(item.id);
    try {
      await sendJson("/api/recycle", "POST", { action: "restore", id: item.id, table: item.table });
      toast("Restored.");
      await load();
    } catch (err) {
      toast((err as Error).message, "error");
    }
    setBusy(null);
  }

  async function remove(item: BinItem) {
    const ok = await confirm({
      title: "Delete this for good?",
      message: `"${item.title}" will be removed from the database. This cannot be undone.`,
      confirmLabel: "Delete permanently",
      danger: true,
    });
    if (!ok) return;
    setBusy(item.id);
    try {
      await sendJson("/api/recycle", "POST", { action: "purge", id: item.id, table: item.table });
      toast("Deleted permanently.");
      await load();
    } catch (err) {
      toast((err as Error).message, "error");
    }
    setBusy(null);
  }

  const sections: { label: string; items: BinItem[] }[] = [];
  for (const item of items) {
    const group = sections.find((entry) => entry.label === item.section);
    if (group) group.items.push(item);
    else sections.push({ label: item.section, items: [item] });
  }

  return (
    <div>
      <PageHeader
        title="Recycle bin"
        description="Deleted pages, photos, and messages stay here. Restore one to put it back, or delete it here to remove it from the database."
      />
      {loading ? (
        <div className="flex items-center gap-2 text-[14px] text-[#5b6775]">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading the recycle bin…
        </div>
      ) : error ? (
        <Notice kind="error">{error}</Notice>
      ) : items.length === 0 ? (
        <p className="ksl-card px-4 py-8 text-center text-[14px] text-[#6b7785]">The recycle bin is empty.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {sections.map((section) => (
            <section key={section.label} className="ksl-card p-4">
              <h2 className="text-[15px] font-bold text-[#0b1f3a]">{section.label}</h2>
              <ul className="mt-2 divide-y divide-[#eef1f4]">
                {section.items.map((item) => (
                  <li key={`${item.table}:${item.id}`} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] text-[#0b1f3a]">{item.title}</span>
                      {item.deletedAt && <span className="text-[12px] text-[#6b7785]">Deleted {formatWhen(item.deletedAt)}</span>}
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      {item.canRestore && (
                        <button
                          type="button"
                          className="text-[13px] font-semibold text-[#0b1f3a] underline disabled:opacity-50"
                          disabled={busy === item.id}
                          onClick={() => restore(item)}
                        >
                          Restore
                        </button>
                      )}
                      {item.canDelete && (
                        <button
                          type="button"
                          className="text-[13px] font-semibold text-[#b42318] underline disabled:opacity-50"
                          disabled={busy === item.id}
                          onClick={() => remove(item)}
                        >
                          Delete
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
