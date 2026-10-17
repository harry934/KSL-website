"use client";

import { useMemo, useState } from "react";
import { GripVertical, ImageIcon, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, StatusBadge } from "@/components/ui/form-bits";
import { DRAG_FROM, useLiveDrag } from "@/components/ui/live-drag";
import { ListPager, SearchBox, matchesSearch } from "@/components/ui/list-tools";
import { siteAssetUrl } from "@/lib/site-url";

export type ListItem = {
  id: string;
  title: string;
  subtitle?: string | null;
  image?: string | null;
  status?: string;
};

const PAGE_SIZE = 25;
const SEARCH_FROM = 6;

/** The list of items in a section, with search, pages, Edit, Remove and (optionally) drag to reorder. */
export function ItemList({
  items,
  onEdit,
  onDelete,
  onReorder,
  showImages,
  emptyText,
}: {
  items: ListItem[];
  onEdit: (id: string) => void;
  onDelete?: (id: string) => void;
  onReorder?: (from: number, to: number) => void;
  showImages?: boolean;
  emptyText: string;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const drag = useLiveDrag((from, to) => {
    onReorder?.(from, to);
    setPage(Math.floor(to / PAGE_SIZE) + 1);
  });

  const searching = query.trim().length > 0;
  const canDrag = !!onReorder && !searching && items.length >= DRAG_FROM;
  const matches = useMemo(
    () =>
      items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => matchesSearch(query, item.title, item.subtitle, item.status)),
    [items, query]
  );
  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const shown = matches.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  if (!items.length) return <EmptyState>{emptyText}</EmptyState>;

  function search(value: string) {
    setQuery(value);
    setPage(1);
  }

  return (
    <div className="space-y-3">
      {(items.length >= SEARCH_FROM || canDrag) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13px] text-[#6b7785]">
            {items.length >= SEARCH_FROM
              ? searching
                ? `${matches.length} of ${items.length} shown`
                : `${items.length} items`
              : "Order on the website"}
            {canDrag ? " · drag a row and the others slide aside. The top item is shown first" : searching && onReorder ? " · clear the search to change the order" : ""}
          </p>
          {items.length >= SEARCH_FROM && <SearchBox value={query} onChange={search} placeholder="Search this list" />}
        </div>
      )}

      {matches.length === 0 ? (
        <EmptyState>
          No results found.{" "}
          <button type="button" className="font-semibold text-[#0b1f3a] underline" onClick={() => search("")}>
            Clear search
          </button>
        </EmptyState>
      ) : (
        <ul className="ksl-card divide-y divide-[#eef1f4]">
          {shown.map(({ item, index }) => (
            <li
              key={item.id}
              ref={drag.itemRef(index)}
              style={canDrag ? drag.itemStyle(index) : undefined}
              className="flex flex-wrap items-center gap-3 bg-white px-4 py-3 hover:bg-[#fafbfc] sm:flex-nowrap"
            >
              {canDrag && (
                <span
                  onPointerDown={(event) => drag.onGripPointerDown(index, event)}
                  className="inline-flex h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center text-[#98a3b1] active:cursor-grabbing"
                  aria-label="Drag to reorder"
                  title="Drag to reorder"
                >
                  <GripVertical className="h-4 w-4" />
                </span>
              )}
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
      )}

      <ListPager page={current} pages={pages} total={matches.length} pageSize={PAGE_SIZE} onPage={setPage} />
    </div>
  );
}
