"use client";

import { useEffect, useState } from "react";
import { appPath } from "@/lib/base-path";

export type DocumentChoice = { id: string; title: string };

/** Published documents from the Downloads section, for "choose a document" dropdowns. */
export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentChoice[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(appPath("/api/public/downloads"))
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

/** Dropdown options for the documents, keeping the saved one even if it is no longer published. */
export function documentOptions(documents: DocumentChoice[], current: string | null | undefined) {
  const options = documents.map((d) => ({ value: d.id, label: d.title }));
  if (current && !documents.some((d) => d.id === current)) options.push({ value: current, label: "Current document" });
  return options;
}
