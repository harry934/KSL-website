"use client";

import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { controlClass } from "@/components/ui/input";
import { cn } from "@/lib/cn";

/** Partial, case-insensitive match against any of the given text values. */
export function matchesSearch(query: string, ...values: (string | null | undefined)[]) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = values.filter(Boolean).join(" ").toLowerCase();
  return words.every((word) => haystack.includes(word));
}

/** Search box with a magnifier and a Clear (×) button. */
export function SearchBox({
  value,
  onChange,
  placeholder = "Search",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative w-full sm:w-[260px]", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a3b1]" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && value) {
            e.preventDefault();
            onChange("");
          }
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(controlClass, "h-[38px] pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden")}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-1 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-[6px] text-[#5b6775] hover:bg-[#eef1f4] hover:text-[#0b1f3a]"
          aria-label="Clear search"
          title="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/** "Showing 1–25 of 80" with Previous / Next. Hidden when everything fits on one page. */
export function ListPager({
  page,
  pages,
  total,
  pageSize,
  onPage,
}: {
  page: number;
  pages: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
}) {
  if (pages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const button =
    "inline-flex h-8 items-center gap-1 rounded-[6px] border border-[#d5dce4] bg-white px-2.5 text-[13px] font-semibold text-[#0b1f3a] hover:bg-[#f4f6f8] disabled:cursor-not-allowed disabled:opacity-45";
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-[#6b7785]">
      <span>
        Showing {from}–{to} of {total}
      </span>
      <span className="flex items-center gap-1.5">
        <button type="button" className={button} disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="h-4 w-4" /> Previous
        </button>
        <span className="px-1">
          Page {page} of {pages}
        </span>
        <button type="button" className={button} disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </span>
    </div>
  );
}
