"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { controlClass } from "@/components/ui/input";
import { matchesSearch } from "@/components/ui/list-tools";
import { cn } from "@/lib/cn";

export type SearchOption = { value: string; label: string; hint?: string };

/** A dropdown you can type into to find an option quickly. */
export function SearchSelect({
  value,
  options,
  onChange,
  placeholder = "Choose…",
  emptyLabel,
  searchPlaceholder = "Type to search",
  disabled,
  "aria-label": ariaLabel,
}: {
  value: string;
  options: SearchOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  /** Adds a first option that clears the choice, e.g. "No document". */
  emptyLabel?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const listId = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const all = useMemo(
    () => (emptyLabel ? [{ value: "", label: emptyLabel }, ...options] : options),
    [emptyLabel, options]
  );
  const shown = useMemo(() => all.filter((o) => matchesSearch(query, o.label, o.hint)), [all, query]);
  const selected = all.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(Math.max(0, all.findIndex((o) => o.value === value)));
    searchRef.current?.focus();
    function onClick(event: MouseEvent) {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open, all, value]);

  function choose(option: SearchOption) {
    onChange(option.value);
    setOpen(false);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => Math.min(shown.length - 1, i + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (shown[active]) choose(shown[active]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={wrap}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        className={cn(controlClass, "flex h-[42px] items-center justify-between gap-2 text-left")}
      >
        <span className={cn("truncate", !selected && "text-[#98a3b1]")}>{selected?.label ?? placeholder}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-[#5b6775]" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-40 overflow-hidden rounded-[8px] border border-[#d5dce4] bg-white shadow-[0_12px_28px_rgba(11,31,58,0.16)]">
          <div className="relative border-b border-[#eef1f4] p-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a3b1]" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder={searchPlaceholder}
              aria-controls={listId}
              className={cn(controlClass, "h-[36px] pl-8")}
            />
          </div>
          <ul id={listId} role="listbox" className="max-h-[260px] overflow-y-auto py-1">
            {shown.length === 0 && <li className="px-3 py-3 text-[13px] text-[#6b7785]">No results found.</li>}
            {shown.map((option, index) => (
              <li
                key={option.value || "__empty"}
                role="option"
                aria-selected={option.value === value}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(option)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 px-3 py-2 text-[14px] text-[#1f2933]",
                  index === active && "bg-[#f1f4f8]"
                )}
              >
                <Check className={cn("h-4 w-4 shrink-0 text-[#0b1f3a]", option.value !== value && "invisible")} />
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate", option.value === "" && "text-[#6b7785]")}>{option.label}</span>
                  {option.hint && <span className="block truncate text-[12px] text-[#6b7785]">{option.hint}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
