"use client";

import { ImageIcon, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, MoveButtons, StatusBadge } from "@/components/ui/form-bits";
import { siteAssetUrl } from "@/lib/site-url";

export type ListItem = {
  id: string;
  title: string;
  subtitle?: string | null;
  image?: string | null;
  status?: string;
};

/** The list of items in a section, with Edit, Remove and (optionally) up/down arrows. */
export function ItemList({
  items,
  onEdit,
  onDelete,
  onMove,
  showImages,
  emptyText,
}: {
  items: ListItem[];
  onEdit: (id: string) => void;
  onDelete?: (id: string) => void;
  onMove?: (index: number, delta: number) => void;
  showImages?: boolean;
  emptyText: string;
}) {
  if (!items.length) return <EmptyState>{emptyText}</EmptyState>;

  return (
    <ul className="ksl-card divide-y divide-[#eef1f4] overflow-hidden">
      {items.map((item, index) => (
        <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-[#fafbfc] sm:flex-nowrap">
          {showImages && (
            <span className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[6px] bg-[#f1f4f7] text-[#98a3b1]">
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={siteAssetUrl(item.image)} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <ImageIcon className="h-5 w-5" />
              )}
            </span>
          )}
          <button type="button" onClick={() => onEdit(item.id)} className="min-w-0 flex-1 text-left">
            <p className="truncate text-[14px] font-semibold text-[#0b1f3a] hover:underline">{item.title || "Untitled"}</p>
            {item.subtitle && <p className="truncate text-[12.5px] text-[#6b7785]">{item.subtitle}</p>}
          </button>
          {item.status && <StatusBadge status={item.status} />}
          <span className="flex shrink-0 items-center gap-1">
            {onMove && (
              <MoveButtons
                onUp={() => onMove(index, -1)}
                onDown={() => onMove(index, 1)}
                first={index === 0}
                last={index === items.length - 1}
              />
            )}
            <Button variant="secondary" size="sm" onClick={() => onEdit(item.id)}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-[#98a3b1] transition-colors hover:bg-[#fdecea] hover:text-[#b42318]"
                aria-label="Remove"
                title="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
