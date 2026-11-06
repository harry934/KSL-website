"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";

type Hit = { id: string; title: string; hint: string; href: string; area: string };

export function PortalSearch({ className }: { className?: string }) {
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) {
      setResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(text)}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function go(hit: Hit) {
    setOpen(false);
    setQuery("");
    router.push(hit.href);
  }

  return (
    <div ref={box} className={cn("relative min-w-0 flex-1", className ?? "max-w-[420px]")}>
      <label className="relative block">
        <span className="sr-only">Search the portal</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a3b1]" />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search news, jobs, photos, documents, messages"
          className="h-10 w-full rounded-[8px] border border-[#d5dce4] bg-white pl-9 pr-3 text-[14px] text-[#0b1f3a] outline-none placeholder:text-[#98a3b1] focus:border-[#0b1f3a]"
        />
      </label>
      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 max-h-[360px] overflow-y-auto rounded-[8px] border border-[#e3e8ee] bg-white shadow-[0_12px_32px_rgba(11,31,58,0.12)]">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-[13.5px] text-[#6b7785]">Nothing matches that.</p>
          ) : (
            <ul>
              {results.map((hit) => (
                <li key={hit.id}>
                  <button
                    type="button"
                    onClick={() => go(hit)}
                    className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left hover:bg-[#f6f8fa]"
                  >
                    <span className="text-[14px] font-semibold text-[#0b1f3a]">{hit.title}</span>
                    <span className="text-[12px] text-[#6b7785]">
                      {hit.area} · {hit.hint}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
