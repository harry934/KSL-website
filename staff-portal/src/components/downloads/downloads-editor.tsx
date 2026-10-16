"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChoiceField, Field, FieldGrid, FormSection, SaveBar, VisibilitySwitch } from "@/components/ui/form-bits";
import { FileField } from "@/components/ui/file-field";
import { ItemList } from "@/components/ui/item-list";
import { useFeedback } from "@/components/ui/feedback";
import { useCan } from "@/components/portal/session-context";
import { slugify } from "@/lib/news";
import { keyFrom, reorderItem } from "@/lib/list-utils";
import { sendJson } from "@/lib/upload-client";
import type { DownloadItemRow } from "@/lib/downloads";

type Draft = Partial<DownloadItemRow> & { isNew?: boolean };

const LANGUAGES = ["English", "Kiswahili", "English and Kiswahili"];

function fileTypeFor(href: string) {
  const ext = href.split(/[?#]/)[0].split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "PDF";
  if (ext === "doc" || ext === "docx") return "Word";
  return null;
}

function baseName(href: string) {
  const clean = href.split(/[?#]/)[0];
  return decodeURIComponent(clean.slice(clean.lastIndexOf("/") + 1));
}

export function DownloadsEditor() {
  const { toast, confirm } = useFeedback();
  const canPublish = useCan("downloads", "publish");
  const canDelete = useCan("downloads", "delete");
  const [baseUrl, setBaseUrl] = useState("");
  const [items, setItems] = useState<DownloadItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/downloads");
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setBaseUrl((data.settings?.base_url ?? "").replace(/\/?$/, "/"));
      setItems(data.items ?? []);
    } else {
      toast(data.error ?? "Could not load the downloads.", "error");
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const sections = useMemo(() => {
    const map = new Map<string, { key: string; anchor: string | null }>();
    for (const item of items) {
      if (!map.has(item.category_label)) map.set(item.category_label, { key: item.category, anchor: item.anchor });
    }
    return map;
  }, [items]);

  function fileHref(item: Partial<DownloadItemRow>) {
    if (item.external_href) return item.external_href;
    if (item.file_name) return baseUrl + item.file_name;
    return "";
  }

  function startNew() {
    const [label, section] = sections.entries().next().value ?? ["", { key: "", anchor: null }];
    setEditing({
      isNew: true,
      title: "",
      subtitle: "",
      category: section.key,
      category_label: label,
      anchor: section.anchor,
      language: "English",
      doc_date: "",
      file_type: "PDF",
      file_name: "",
      external_href: "",
      sort_order: items.length ? Math.max(...items.map((i) => i.sort_order)) + 1 : 0,
      status: canPublish ? "published" : "draft",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveItem(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (!editing.title?.trim()) {
      toast("Give the document a name.", "error");
      return;
    }
    if (!editing.category_label?.trim()) {
      toast("Choose which part of the Downloads page it belongs in.", "error");
      return;
    }
    if (!fileHref(editing)) {
      toast("Upload the file, or paste a link to it.", "error");
      return;
    }
    setSaving(true);
    try {
      const { isNew, ...row } = editing;
      const id = isNew ? keyFrom(editing.title, items.map((i) => i.id)) : editing.id;
      await sendJson("/api/downloads", "POST", { ...row, id });
      toast(editing.status === "published" ? "Document saved and shown on the website." : "Document saved as hidden (draft).");
      setEditing(null);
      load();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function move(from: number, to: number) {
    const next = reorderItem(items, from, to).map((item, i) => ({ ...item, sort_order: i }));
    const before = new Map(items.map((i) => [i.id, i.sort_order]));
    setItems(next);
    try {
      await Promise.all(next.filter((i) => before.get(i.id) !== i.sort_order).map((i) => sendJson("/api/downloads", "POST", i)));
    } catch (err) {
      toast((err as Error).message, "error");
      load();
    }
  }

  async function remove(id: string) {
    const item = items.find((i) => i.id === id);
    const ok = await confirm({
      title: "Delete this document?",
      message: item ? `"${item.title}" will no longer be available to download.` : undefined,
      confirmLabel: "Delete document",
      danger: true,
    });
    if (!ok) return;
    try {
      await sendJson(`/api/downloads?id=${encodeURIComponent(id)}`, "DELETE");
      toast("Document deleted.");
      load();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[14px] text-[#5b6775]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading downloads…
      </div>
    );
  }

  if (editing) {
    const set = (patch: Partial<DownloadItemRow>) => setEditing({ ...editing, ...patch });
    return (
      <form onSubmit={saveItem} className="space-y-4">
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <FormSection title={editing.isNew ? "New document" : "Edit document"}>
            <Field label="Document name">
              <Input value={editing.title ?? ""} onChange={(e) => set({ title: e.target.value })} autoFocus={editing.isNew} />
            </Field>
            <Field label="Short description" optional>
              <Input value={editing.subtitle ?? ""} onChange={(e) => set({ subtitle: e.target.value })} />
            </Field>
            <Field label="File">
              <FileField
                module="downloads"
                value={fileHref(editing)}
                onChange={(href) => set({ external_href: href, file_name: href ? baseName(href) : "", file_type: fileTypeFor(href) ?? editing.file_type })}
              />
            </Field>
          </FormSection>
          <div className="space-y-4">
            <FormSection title="Visibility">
              <VisibilitySwitch status={editing.status ?? "draft"} canPublish={canPublish} onChange={(status) => set({ status })} />
            </FormSection>
            <FormSection title="Details">
              <Field label="Part of the Downloads page">
                <ChoiceField
                  value={editing.category_label ?? ""}
                  options={Array.from(sections.keys()).map((label) => ({ value: label, label }))}
                  onChange={(label) => {
                    const section = sections.get(label);
                    set({ category_label: label, category: section?.key ?? slugify(label), anchor: section?.anchor ?? null });
                  }}
                  newLabel="Add a new part…"
                />
              </Field>
              <FieldGrid className="sm:grid-cols-1">
                <Field label="Language">
                  <ChoiceField
                    value={editing.language ?? ""}
                    options={LANGUAGES.map((l) => ({ value: l, label: l }))}
                    onChange={(language) => set({ language })}
                    newLabel="Another language…"
                  />
                </Field>
                <Field label="Date" optional>
                  <Input value={editing.doc_date ?? ""} onChange={(e) => set({ doc_date: e.target.value })} placeholder="e.g. November 2024" />
                </Field>
              </FieldGrid>
            </FormSection>
          </div>
        </div>
        <SaveBar>
          <Button variant="secondary" onClick={() => setEditing(null)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save document"}
          </Button>
        </SaveBar>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={startNew}>
          <Plus className="h-4 w-4" /> New document
        </Button>
      </div>
      <ItemList
        items={items.map((i) => ({
          id: i.id,
          title: i.title,
          subtitle: [i.category_label, i.language, i.file_type].filter(Boolean).join(" · "),
          status: i.status,
        }))}
        onEdit={(id) => {
          const item = items.find((i) => i.id === id);
          if (item) setEditing({ ...item, isNew: false });
        }}
        onDelete={canDelete ? remove : undefined}
        onReorder={move}
        emptyText="No documents yet. Click New document to add one."
      />
    </div>
  );
}
