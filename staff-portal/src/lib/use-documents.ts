"use client";

import { useEffect, useState } from "react";

export type DocumentChoice = { id: string; title: string };

/** Published documents from the Downloads section, for "choose a document" dropdowns. */
export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentChoice[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/downloads")
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data: { items?: { id: string; title: string; aliasOf?: string }[] }) => {
        if (cancelled) return;
        setDocuments((data.items ?? []).filter((d) => !d.aliasOf).map((d) => ({ id: d.id, title: d.title })));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return documents;
}
