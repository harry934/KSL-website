"use client";

import { useEffect, useRef } from "react";

/** Opens the item named in ?edit= once, then removes that part of the address. */
export function useOpenEdit<T extends { id: string }>(loading: boolean, items: T[], open: (item: T) => void) {
  const opened = useRef(false);
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    if (loading || opened.current) return;
    opened.current = true;
    const url = new URL(window.location.href);
    const id = url.searchParams.get("edit");
    if (!id) return;
    url.searchParams.delete("edit");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    const item = items.find((row) => row.id === id);
    if (item) openRef.current(item);
  }, [loading, items]);
}
