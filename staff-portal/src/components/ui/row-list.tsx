"use client";

import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DRAG_FROM, useLiveDrag } from "@/components/ui/live-drag";
import { reorderItem } from "@/lib/list-utils";

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
  const drag = useLiveDrag((from, to) => onChange(reorderItem(items, from, to)));
  const canDrag = items.length >= DRAG_FROM;

  function update(index: number, patch: Partial<T>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
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
          ref={drag.itemRef(index)}
          style={canDrag ? drag.itemStyle(index) : undefined}
          className="flex items-start gap-2 rounded-[8px] border border-[#e3e8ee] bg-[#fafbfc] p-3"
        >
          {canDrag && (
            <span
              onPointerDown={(event) => drag.onGripPointerDown(index, event)}
              className="mt-1 inline-flex h-7 w-6 shrink-0 cursor-grab touch-none items-center justify-center text-[#98a3b1] active:cursor-grabbing"
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
