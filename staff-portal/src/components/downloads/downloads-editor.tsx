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
import { sendJson, awaitingReview, DRAFT_SAVED } from "@/lib/upload-client";
import { downloadSource, formatBytes, type DownloadItemRow } from "@/lib/downloads";
import { useOpenEdit } from "@/lib/open-edit";
import { appPath } from "@/lib/base-path";

type Draft = Partial<DownloadItemRow> & { isNew?: boolean };

const LANGUAGES = ["English", "Kiswahili", "English and Kiswahili"];

function fileTypeFor(href: string) {
  const ext = href.split(/[?#]/)[0].split(".").pop()?.toLowerCase();
  if (!ext || ext.length > 5 || ext === href.toLowerCase()) return null;
  if (ext === "pdf") return "PDF";
  if (ext === "doc" || ext === "docx") return "Word";
  return ext.toUpperCase();
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
    const res = await fetch(appPath("/api/downloads"));
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

  useOpenEdit(loading, items, (item) => setEditing({ ...item, isNew: false }));

  const sections = useMemo(() => {
    const map = new Map<string, { key: string; anchor: string | null }>();
    for (const item of items) {
      if (!map.has(item.category_label)) map.set(item.category_label, { key: item.category, anchor: item.anchor });
    }
    return map;
  }, [items]);

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
      source: "standard",
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
    const source = downloadSource(editing as DownloadItemRow);
    if (source === "storage" && !editing.external_href?.trim()) {
      toast("Upload the file into storage.", "error");
      return;
    }
    if (source === "standard" && !editing.file_name?.trim()) {
      toast("Enter the file name in the docs folder.", "error");
      return;
    }
    setSaving(true);
    try {
      const { isNew, ...row } = editing;
      const id = isNew ? keyFrom(editing.title, items.map((i) => i.id)) : editing.id;
      const saved = await sendJson("/api/downloads", "POST", { ...row, id });
      toast(awaitingReview(saved) ? DRAFT_SAVED : editing.status === "published" ? "Document saved and shown on the website." : "Document saved as hidden (draft).");
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
      title: "Remove this document?",
      message: item ? `"${item.title}" is permanently deleted from the database.` : "It is permanently deleted from the database.",
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
            <Field label="Where the file is kept">
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Where the file is kept">
                {(
                  [
                    ["standard", "Standard"],
                    ["storage", "Storage"],
                  ] as const
                ).map(([value, label]) => {
                  const selected = downloadSource(editing as DownloadItemRow) === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => set({ source: value })}
                      className={
                        selected
                          ? "rounded-full border border-[#0b1f3a] bg-[#0b1f3a] px-4 py-2 text-[13px] font-semibold text-white"
                          : "rounded-full border border-[#d5dde6] bg-white px-4 py-2 text-[13px] font-semibold text-[#0b1f3a]"
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[12.5px] text-[#6b7785]">
                {downloadSource(editing as DownloadItemRow) === "storage"
                  ? "The file is uploaded and can be reused on the website."
                  : `The file stays in the docs folder (${baseUrl || "docs/"}). Enter its file name only.`}
              </p>
            </Field>
            {downloadSource(editing as DownloadItemRow) === "storage" ? (
              <Field label="File">
                <FileField
                  module="downloads"
                  allowLink={false}
                  value={editing.external_href || ""}
                  onChange={(href, file) =>
                    set({
                      source: "storage",
                      external_href: href,
                      file_name: href ? baseName(href) : "",
                      file_type: fileTypeFor(href) ?? editing.file_type,
                      file_bytes: file ? file.size : editing.file_bytes,
                    })
                  }
                />
              </Field>
            ) : (
              <Field label="File name">
                <Input
                  value={editing.file_name ?? ""}
                  onChange={(e) =>
                    set({
                      source: "standard",
                      external_href: "",
                      file_name: e.target.value.trim(),
                      file_type: fileTypeFor(e.target.value) ?? editing.file_type,
                    })
                  }
                  placeholder="Service-Delivery-Charter.pdf"
                />
              </Field>
            )}
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
                <Field label="Leave the website on" hint="Use this for tenders. The file stays up through this day, then it is removed.">
                  <Input type="date" value={editing.expires_on ?? ""} onChange={(e) => set({ expires_on: e.target.value })} />
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
          subtitle: [i.category_label, i.file_type, i.file_bytes ? formatBytes(Number(i.file_bytes)) : "", i.expires_on ? `Until ${i.expires_on}` : ""]
            .filter(Boolean)
            .join(" · "),
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
