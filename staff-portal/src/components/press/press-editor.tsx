"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChoiceField, Field, FieldGrid, FormSection, SaveBar, Textarea, VisibilitySwitch } from "@/components/ui/form-bits";
import { FileField } from "@/components/ui/file-field";
import { ItemList } from "@/components/ui/item-list";
import { useFeedback } from "@/components/ui/feedback";
import { useCan } from "@/components/portal/session-context";
import { reorderItem } from "@/lib/list-utils";
import { sendJson } from "@/lib/upload-client";
import { documentOptions, useDocuments } from "@/lib/use-documents";
import { SearchSelect } from "@/components/ui/search-select";
import { cn } from "@/lib/cn";
import type { PressAssetRow } from "@/lib/press";

type Source = "document" | "file" | "link";
type Draft = Partial<PressAssetRow> & { source: Source };

const SOURCES: { value: Source; label: string; hint: string }[] = [
  { value: "document", label: "A document from Downloads", hint: "Pick one of the documents already on the Downloads page." },
  { value: "file", label: "A file I upload", hint: "For example the logo or a press release." },
  { value: "link", label: "A link", hint: "A page on this website or another website." },
];

function typeForHref(href: string) {
  const ext = href.split(/[?#]/)[0].split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "PDF";
  if (ext === "doc" || ext === "docx") return "Word";
  if (ext === "png" || ext === "jpg" || ext === "jpeg" || ext === "webp") return "Image";
  return null;
}

function sourceOf(row: Partial<PressAssetRow>): Source {
  if (row.download_id) return "document";
  if (row.href && typeForHref(row.href)) return "file";
  return "link";
}

export function PressEditor() {
  const { toast, confirm } = useFeedback();
  const canPublish = useCan("press", "publish");
  const canDelete = useCan("press", "delete");
  const documents = useDocuments();
  const [boilerplate, setBoilerplate] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [assets, setAssets] = useState<PressAssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/press");
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setBoilerplate(data.settings?.boilerplate ?? "");
      setContactEmail(data.settings?.contact_email ?? "");
      setContactPhone(data.settings?.contact_phone ?? "");
      setAssets(data.assets ?? []);
    } else {
      toast(data.error ?? "Could not load the press page.", "error");
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const typeOptions = useMemo(() => {
    const names = new Set(["PDF", "Word", "Image", "Page", ...assets.map((a) => a.asset_type).filter((t): t is string => !!t)]);
    return Array.from(names).map((t) => ({ value: t, label: t }));
  }, [assets]);

  async function saveSettings() {
    setSaving("settings");
    try {
      await sendJson("/api/press", "POST", { scope: "settings", boilerplate, contact_email: contactEmail, contact_phone: contactPhone });
      toast("Press contact saved.");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(null);
    }
  }

  function startNew() {
    setEditing({
      source: "document",
      title: "",
      href: "",
      download_id: "",
      asset_type: "PDF",
      sort_order: assets.length ? Math.max(...assets.map((a) => a.sort_order)) + 1 : 0,
      status: canPublish ? "published" : "draft",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveAsset(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (!editing.title?.trim()) {
      toast("Give it a name.", "error");
      return;
    }
    const { source, ...row } = editing;
    if (source === "document" && !row.download_id) {
      toast("Choose a document.", "error");
      return;
    }
    if (source !== "document" && !row.href?.trim()) {
      toast(source === "file" ? "Upload the file." : "Paste the web address.", "error");
      return;
    }
    setSaving("asset");
    try {
      await sendJson("/api/press", "POST", {
        ...row,
        download_id: source === "document" ? row.download_id : null,
        href: source === "document" ? null : row.href?.trim(),
      });
      toast(row.status === "published" ? "Saved and shown on the website." : "Saved as hidden (draft).");
      setEditing(null);
      load();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(null);
    }
  }

  async function move(from: number, to: number) {
    const next = reorderItem(assets, from, to).map((a, i) => ({ ...a, sort_order: i }));
    const before = new Map(assets.map((a) => [a.id, a.sort_order]));
    setAssets(next);
    try {
      await Promise.all(next.filter((a) => before.get(a.id) !== a.sort_order).map((a) => sendJson("/api/press", "POST", a)));
    } catch (err) {
      toast((err as Error).message, "error");
      load();
    }
  }

  async function remove(id: string) {
    const item = assets.find((a) => a.id === id);
    const ok = await confirm({
      title: "Remove this item?",
      message: item ? `"${item.title}" will be removed from the press kit.` : undefined,
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    try {
      await sendJson(`/api/press?id=${encodeURIComponent(id)}`, "DELETE");
      toast("Removed.");
      load();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[14px] text-[#5b6775]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading the press kit…
      </div>
    );
  }

  if (editing) {
    const set = (patch: Partial<Draft>) => setEditing({ ...editing, ...patch });
    return (
      <form onSubmit={saveAsset} className="space-y-4">
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <FormSection title={editing.id ? "Edit press kit item" : "New press kit item"}>
            <Field label="Name" hint="What visitors see, e.g. KSL logo (PNG).">
              <Input value={editing.title ?? ""} onChange={(e) => set({ title: e.target.value })} autoFocus={!editing.id} />
            </Field>
            <div>
              <p className="mb-2 text-[13px] font-semibold text-[#1f2933]">What visitors get</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {SOURCES.map((s) => (
                  <label
                    key={s.value}
                    className={cn(
                      "cursor-pointer rounded-[8px] border px-3 py-2.5 transition-colors",
                      editing.source === s.value ? "border-[#0b1f3a] bg-[#f1f4f8]" : "border-[#e3e8ee] hover:bg-[#fafbfc]"
                    )}
                  >
                    <input
                      type="radio"
                      name="press-source"
                      className="sr-only"
                      checked={editing.source === s.value}
                      onChange={() => set({ source: s.value })}
                    />
                    <span className="block text-[14px] font-semibold text-[#0b1f3a]">{s.label}</span>
                    <span className="mt-0.5 block text-[12px] text-[#6b7785]">{s.hint}</span>
                  </label>
                ))}
              </div>
            </div>
            {editing.source === "document" && (
              <Field label="Document">
                <SearchSelect
                  value={editing.download_id ?? ""}
                  options={documentOptions(documents, editing.download_id)}
                  onChange={(download_id) => set({ download_id })}
                  placeholder="Choose a document…"
                  searchPlaceholder="Search documents"
                />
              </Field>
            )}
            {editing.source === "file" && (
              <Field label="File">
                <FileField
                  module="press"
                  allowImages
                  value={editing.href ?? ""}
                  onChange={(href) => set({ href, asset_type: typeForHref(href) ?? editing.asset_type })}
                />
              </Field>
            )}
            {editing.source === "link" && (
              <Field label="Web address" hint="Copy it from the address bar of your browser.">
                <Input value={editing.href ?? ""} onChange={(e) => set({ href: e.target.value })} placeholder="https://…" />
              </Field>
            )}
          </FormSection>
          <div className="space-y-4">
            <FormSection title="Visibility">
              <VisibilitySwitch status={editing.status ?? "draft"} canPublish={canPublish} onChange={(status) => set({ status })} />
            </FormSection>
            <FormSection title="Label">
              <Field label="Shown next to the name" hint="Tells visitors what kind of file it is.">
                <ChoiceField value={editing.asset_type ?? ""} options={typeOptions} onChange={(asset_type) => set({ asset_type })} />
              </Field>
            </FormSection>
          </div>
        </div>
        <SaveBar>
          <Button variant="secondary" onClick={() => setEditing(null)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving === "asset"}>
            {saving === "asset" ? "Saving…" : "Save"}
          </Button>
        </SaveBar>
      </form>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[15px] font-bold text-[#0b1f3a]">Press kit</h2>
          <Button onClick={startNew}>
            <Plus className="h-4 w-4" /> Add item
          </Button>
        </div>
        <ItemList
          items={assets.map((a) => ({ id: a.id, title: a.title, subtitle: a.asset_type, status: a.status }))}
          onEdit={(id) => {
            const row = assets.find((a) => a.id === id);
            if (row) setEditing({ ...row, source: sourceOf(row) });
          }}
          onDelete={canDelete ? remove : undefined}
          onReorder={move}
          emptyText="Nothing in the press kit yet. Click Add item to start."
        />
      </div>

      <FormSection title="Press contact" description="Shown to journalists on the Press page.">
        <Field label="About Kenya Shipyards" hint="A short paragraph journalists can copy into their stories.">
          <Textarea className="min-h-[110px]" value={boilerplate} onChange={(e) => setBoilerplate(e.target.value)} />
        </Field>
        <FieldGrid>
          <Field label="Email">
            <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          </Field>
          <Field label="Phone">
            <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </Field>
        </FieldGrid>
        <Button onClick={saveSettings} disabled={saving === "settings"}>
          {saving === "settings" ? "Saving…" : "Save press contact"}
        </Button>
      </FormSection>
    </div>
  );
}
