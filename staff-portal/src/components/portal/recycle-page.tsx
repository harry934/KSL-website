"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/portal/page-header";
import { Button } from "@/components/ui/button";
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

function itemKey(item: BinItem) {
  return `${item.table}:${item.id}`;
}

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
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    try {
      const data = await sendJson("/api/recycle", "GET");
      setItems(data.items ?? []);
      setSelected({});
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sections = useMemo(() => {
    const groups: { label: string; items: BinItem[] }[] = [];
    for (const item of items) {
      const group = groups.find((entry) => entry.label === item.section);
      if (group) group.items.push(item);
      else groups.push({ label: item.section, items: [item] });
    }
    return groups;
  }, [items]);

  const selectedItems = items.filter((item) => selected[itemKey(item)]);
  const allSelected = items.length > 0 && items.every((item) => selected[itemKey(item)]);
  const someSelected = selectedItems.length > 0 && !allSelected;

  function toggleAll(checked: boolean) {
    if (!checked) {
      setSelected({});
      return;
    }
    const next: Record<string, boolean> = {};
    for (const item of items) next[itemKey(item)] = true;
    setSelected(next);
  }

  function toggleOne(item: BinItem, checked: boolean) {
    setSelected((current) => {
      const next = { ...current };
      const key = itemKey(item);
      if (checked) next[key] = true;
      else delete next[key];
      return next;
    });
  }

  function toggleSection(sectionItems: BinItem[], checked: boolean) {
    setSelected((current) => {
      const next = { ...current };
      for (const item of sectionItems) {
        const key = itemKey(item);
        if (checked) next[key] = true;
        else delete next[key];
      }
      return next;
    });
  }

  async function runBulk(action: "restore" | "purge", targets: BinItem[]) {
    if (!targets.length) return;
    if (action === "purge") {
      const ok = await confirm({
        title: targets.length === 1 ? "Delete this for good?" : `Delete ${targets.length} items for good?`,
        message:
          targets.length === 1
            ? `"${targets[0].title}" will be removed from the database. This cannot be undone.`
            : "Selected items will be removed from the database. This cannot be undone.",
        confirmLabel: targets.length === 1 ? "Delete permanently" : "Delete selected",
        danger: true,
      });
      if (!ok) return;
    }
    setBusy(true);
    try {
      await sendJson("/api/recycle", "POST", {
        action,
        items: targets.map((item) => ({ id: item.id, table: item.table })),
      });
      toast(action === "restore" ? (targets.length === 1 ? "Restored." : `Restored ${targets.length} items.`) : "Deleted permanently.");
      await load();
    } catch (err) {
      toast((err as Error).message, "error");
    }
    setBusy(false);
  }

  return (
    <div>
      <PageHeader
        title="Recycle bin"
        description="Staff accounts and inbox messages stay here so you can restore them. News, gallery, and other pages are deleted from the database immediately and do not appear here."
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
          <div className="ksl-card flex flex-wrap items-center gap-3 p-3">
            <label className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-[#0b1f3a]">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#0b1f3a]"
                checked={allSelected}
                ref={(node) => {
                  if (node) node.indeterminate = someSelected;
                }}
                onChange={(event) => toggleAll(event.target.checked)}
                disabled={busy}
              />
              Select all
            </label>
            <span className="text-[12.5px] text-[#6b7785]">
              {selectedItems.length ? `${selectedItems.length} selected` : `${items.length} items`}
            </span>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy || !selectedItems.some((item) => item.canRestore)}
                onClick={() => runBulk("restore", selectedItems.filter((item) => item.canRestore))}
              >
                Restore selected
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={busy || !selectedItems.some((item) => item.canDelete)}
                onClick={() => runBulk("purge", selectedItems.filter((item) => item.canDelete))}
              >
                Delete selected
              </Button>
            </div>
          </div>

          {sections.map((section) => {
            const sectionSelected = section.items.every((item) => selected[itemKey(item)]);
            const sectionSome = section.items.some((item) => selected[itemKey(item)]) && !sectionSelected;
            return (
              <section key={section.label} className="ksl-card p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-[15px] font-bold text-[#0b1f3a]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#0b1f3a]"
                      checked={sectionSelected}
                      ref={(node) => {
                        if (node) node.indeterminate = sectionSome;
                      }}
                      onChange={(event) => toggleSection(section.items, event.target.checked)}
                      disabled={busy}
                    />
                    {section.label}
                  </label>
                  <span className="text-[12.5px] text-[#6b7785]">{section.items.length}</span>
                </div>
                <ul className="mt-2 divide-y divide-[#eef1f4]">
                  {section.items.map((item) => {
                    const key = itemKey(item);
                    const checked = !!selected[key];
                    return (
                      <li key={key} className="flex items-center gap-3 py-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 shrink-0 accent-[#0b1f3a]"
                          checked={checked}
                          onChange={(event) => toggleOne(item, event.target.checked)}
                          disabled={busy}
                          aria-label={`Select ${item.title}`}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] text-[#0b1f3a]">{item.title}</span>
                          {item.deletedAt && <span className="text-[12px] text-[#6b7785]">Deleted {formatWhen(item.deletedAt)}</span>}
                        </span>
                        <span className="flex shrink-0 items-center gap-3">
                          {item.canRestore && (
                            <button
                              type="button"
                              className="text-[13px] font-semibold text-[#0b1f3a] underline disabled:opacity-50"
                              disabled={busy}
                              onClick={() => runBulk("restore", [item])}
                            >
                              Restore
                            </button>
                          )}
                          {item.canDelete && (
                            <button
                              type="button"
                              className="text-[13px] font-semibold text-[#b42318] underline disabled:opacity-50"
                              disabled={busy}
                              onClick={() => runBulk("purge", [item])}
                            >
                              Delete
                            </button>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
