"use client";

import { useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reorderItem } from "@/lib/list-utils";
import { cn } from "@/lib/cn";

/** An editable list of small records: each row can be dragged, removed or changed in place. */
export function RowList<T>({
  items,
  onChange,
  renderRow,
  newItem,
  addLabel = "Add",
  emptyText = "Nothing added yet.",
}: {
  items: T[];
  onChange: (items: T[]) => void;
  renderRow: (item: T, update: (patch: Partial<T>) => void, index: number) => React.ReactNode;
  newItem: () => T;
  addLabel?: string;
  emptyText?: string;
}) {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  function update(index: number, patch: Partial<T>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function dropOn(index: number) {
    const from = dragFrom;
    setDragFrom(null);
    setDragOver(null);
    if (from == null || from === index) return;
    onChange(reorderItem(items, from, index));
  }

  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <p className="rounded-[8px] border border-dashed border-[#d5dce4] px-4 py-4 text-center text-[13px] text-[#6b7785]">
          {emptyText}
        </p>
      )}
      {items.map((item, index) => (
        <div
          key={index}
          className={cn(
            "flex items-start gap-2 rounded-[8px] border border-[#e3e8ee] bg-[#fafbfc] p-3",
            dragOver === index && dragFrom !== index && "border-[#0b1f3a]"
          )}
          onDragOver={(event) => {
            if (items.length < 2) return;
            event.preventDefault();
            setDragOver(index);
          }}
          onDrop={(event) => {
            event.preventDefault();
            dropOn(index);
          }}
        >
          {items.length > 1 && (
            <span
              draggable
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", String(index));
                setDragFrom(index);
              }}
              onDragEnd={() => {
                setDragFrom(null);
                setDragOver(null);
              }}
              className="mt-1 inline-flex h-7 w-6 shrink-0 cursor-grab items-center justify-center text-[#98a3b1] active:cursor-grabbing"
              aria-label="Drag to reorder"
              title="Drag to reorder"
            >
              <GripVertical className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0 flex-1">{renderRow(item, (patch) => update(index, patch), index)}</div>
          <button
            type="button"
            onClick={() => onChange(items.filter((_, i) => i !== index))}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] text-[#98a3b1] transition-colors hover:bg-[#fdecea] hover:text-[#b42318]"
            aria-label="Remove"
            title="Remove"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <Button variant="secondary" size="sm" onClick={() => onChange([...items, newItem()])}>
        <Plus className="h-4 w-4" />
        {addLabel}
      </Button>
    </div>
  );
}
