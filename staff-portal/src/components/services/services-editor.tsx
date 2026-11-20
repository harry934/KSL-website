"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GripVertical, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChoiceField,
  Field,
  FormSection,
  SaveBar,
  Textarea,
  VisibilitySwitch,
} from "@/components/ui/form-bits";
import { FileField } from "@/components/ui/file-field";
import { ImageField } from "@/components/ui/image-field";
import { ItemList } from "@/components/ui/item-list";
import { RowList } from "@/components/ui/row-list";
import { useFeedback } from "@/components/ui/feedback";
import { useCan } from "@/components/portal/session-context";
import { SERVICE_GROUPS, type ServiceRow } from "@/lib/services";
import { keyFrom, orderedGroups, reorderItem, uniqueSlug } from "@/lib/list-utils";
import { useLiveDrag } from "@/components/ui/live-drag";
import { sendJson, awaitingReview, DRAFT_SAVED } from "@/lib/upload-client";
import { useOpenEdit } from "@/lib/open-edit";
import { appPath } from "@/lib/base-path";

type DocRow = { key: string; title: string; href: string };

function serviceCategories(items: ServiceRow[]) {
  const names: string[] = [];
  for (const item of items) {
    const name = item.category || "General";
    if (!names.includes(name)) names.push(name);
  }
  return names;
}

function catalogToRows(catalog: Record<string, { title: string; href: string }>): DocRow[] {
  return Object.entries(catalog).map(([key, v]) => ({ key, title: v.title ?? "", href: v.href ?? "" }));
}

export function ServicesEditor() {
  const { toast, confirm } = useFeedback();
  const canPublish = useCan("services", "publish");
  const canDelete = useCan("services", "delete");
  const [intro, setIntro] = useState("");
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [savedCatalog, setSavedCatalog] = useState<Record<string, { title: string; href: string }>>({});
  const [items, setItems] = useState<ServiceRow[]>([]);
  const [groupOrder, setGroupOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<ServiceRow> | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(appPath("/api/services"));
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setIntro(data.intro ?? "");
      setSavedCatalog(data.download_catalog ?? {});
      setDocs(catalogToRows(data.download_catalog ?? {}));
      setItems(data.items ?? []);
      setGroupOrder(Array.isArray(data.group_order) ? data.group_order : []);
    } else {
      toast(data.error ?? "Could not load the services.", "error");
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  useOpenEdit(loading, items, (item) => setEditing(item));

  const shownGroups = useMemo(() => orderedGroups(serviceCategories(items), groupOrder), [items, groupOrder]);
  const groupDrag = useLiveDrag((from, to) => {
    const next = reorderItem(shownGroups, from, to);
    setGroupOrder(next);
    void sendJson("/api/services", "POST", { scope: "groups", group_order: next }).catch((err) => {
      toast((err as Error).message, "error");
      void load();
    });
  });

  const categories = useMemo(() => {
    const names = [...SERVICE_GROUPS] as string[];
    for (const item of items) {
      if (item.category && !names.includes(item.category)) names.push(item.category);
    }
    return names.map((name) => ({ value: name, label: name }));
  }, [items]);

  async function saveSettings(what: "intro" | "documents") {
    const missing = docs.find((d) => !d.title.trim() || !d.href.trim());
    if (what === "documents" && missing) {
      toast("Every document needs a name and a file (or link).", "error");
      return;
    }
    const taken: string[] = [];
    let download_catalog: Record<string, { title: string; href: string }> = {};
    if (what === "documents") {
      for (const doc of docs) {
        const key = doc.key || keyFrom(doc.title, [...taken, ...docs.map((d) => d.key).filter(Boolean)]);
        taken.push(key);
        download_catalog[key] = { title: doc.title.trim(), href: doc.href.trim() };
      }
    } else {
      download_catalog = savedCatalog;
    }
    setSaving(what);
    try {
      const saved = await sendJson("/api/services", "POST", { scope: "settings", intro, download_catalog });
      toast(awaitingReview(saved) ? DRAFT_SAVED : what === "intro" ? "Introduction saved." : "Documents saved.");
      setSavedCatalog(download_catalog);
      if (what === "documents") setDocs(catalogToRows(download_catalog));
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(null);
    }
  }

  function startNew() {
    setEditing({
      title: "",
      slug: "",
      category: categories[0]?.value ?? "",
      excerpt: "",
      detail: "",
      image_path: "",
      downloads: [],
      sort_order: items.length ? Math.max(...items.map((i) => i.sort_order)) + 1 : 0,
      status: canPublish ? "published" : "draft",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveItem(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (!editing.title?.trim()) {
      toast("Give the service a name.", "error");
      return;
    }
    setSaving("item");
    try {
      const slug =
        editing.slug?.trim() ||
        uniqueSlug(editing.title, items.filter((i) => i.id !== editing.id).map((i) => i.slug), "service");
      const saved = await sendJson("/api/services", "POST", { ...editing, slug });
      toast(awaitingReview(saved) ? DRAFT_SAVED : editing.status === "published" ? "Service saved and shown on the website." : "Service saved as hidden (draft).");
      setEditing(null);
      load();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(null);
    }
  }

  async function move(category: string, from: number, to: number) {
    const group = items.filter((item) => (item.category || "General") === category);
    const updated = reorderItem(group, from, to).map((item, i) => ({ ...item, sort_order: i }));
    const before = new Map(group.map((item) => [item.id, item.sort_order]));
    const byId = new Map(updated.map((item) => [item.id, item]));
    setItems((list) => list.map((item) => byId.get(item.id) ?? item));
    try {
      await Promise.all(updated.filter((item) => before.get(item.id) !== item.sort_order).map((item) => sendJson("/api/services", "POST", item)));
    } catch (err) {
      toast((err as Error).message, "error");
      load();
    }
  }

  async function remove(id: string) {
    const item = items.find((i) => i.id === id);
    const ok = await confirm({
      title: "Delete this service?",
      message: item ? `"${item.title}" moves to the recycle bin. Restore it or delete it for good from there.` : "It moves to the recycle bin. Restore it or delete it for good from there.",
      confirmLabel: "Move to bin",
      danger: true,
    });
    if (!ok) return;
    try {
      await sendJson(`/api/services?id=${encodeURIComponent(id)}`, "DELETE");
      toast("Moved to the recycle bin.");
      load();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[14px] text-[#5b6775]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading services…
      </div>
    );
  }

  if (editing) {
    const set = (patch: Partial<ServiceRow>) => setEditing({ ...editing, ...patch });
    const attached = new Set(editing.downloads ?? []);
    const savedDocs = catalogToRows(savedCatalog);
    return (
      <form onSubmit={saveItem} className="space-y-4">
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <FormSection title={editing.id ? "Edit service" : "New service"}>
            <Field label="Service name">
              <Input value={editing.title ?? ""} onChange={(e) => set({ title: e.target.value })} autoFocus={!editing.id} />
            </Field>
            <Field label="Group">
              <ChoiceField
                value={editing.category ?? ""}
                options={categories}
                onChange={(category) => set({ category })}
                newLabel="Add a new group…"
              />
            </Field>
            <Field label="Short summary" hint="Shown on the service card.">
              <Textarea rows={2} className="min-h-[70px]" value={editing.excerpt ?? ""} onChange={(e) => set({ excerpt: e.target.value })} />
            </Field>
            <Field label="Full description" hint="Shown when a visitor opens the service. Leave an empty line between paragraphs.">
              <Textarea className="min-h-[220px]" value={editing.detail ?? ""} onChange={(e) => set({ detail: e.target.value })} />
            </Field>
          </FormSection>
          <div className="space-y-4">
            <FormSection title="Visibility">
              <VisibilitySwitch status={editing.status ?? "draft"} canPublish={canPublish} onChange={(status) => set({ status })} />
            </FormSection>
            <FormSection title="Photo">
              <ImageField module="services" value={editing.image_path ?? ""} onChange={(image_path) => set({ image_path })} />
            </FormSection>
            <FormSection title="Documents" description="Tick the documents visitors can download from this service.">
              {savedDocs.length === 0 ? (
                <p className="text-[13px] text-[#6b7785]">No documents yet. Add them under Documents on the Services page.</p>
              ) : (
                <div className="space-y-2">
                  {savedDocs.map((doc) => (
                    <label key={doc.key} className="flex cursor-pointer items-center gap-2.5 text-[14px] text-[#1f2933]">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[#0b1f3a]"
                        checked={attached.has(doc.key)}
                        onChange={(e) => {
                          const next = new Set(attached);
                          if (e.target.checked) next.add(doc.key);
                          else next.delete(doc.key);
                          set({ downloads: savedDocs.map((d) => d.key).filter((k) => next.has(k)) });
                        }}
                      />
                      {doc.title}
                    </label>
                  ))}
                </div>
              )}
            </FormSection>
          </div>
        </div>
        <SaveBar>
          <Button variant="secondary" onClick={() => setEditing(null)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving === "item"}>
            {saving === "item" ? "Saving…" : "Save service"}
          </Button>
        </SaveBar>
      </form>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[15px] font-bold text-[#0b1f3a]">Services</h2>
          <Button onClick={startNew}>
            <Plus className="h-4 w-4" /> New service
          </Button>
        </div>
        {items.length === 0 ? (
          <ItemList
            items={[]}
            onEdit={() => undefined}
            emptyText="No services yet. Click New service to add one."
          />
        ) : (
          <div className="space-y-5">
            {shownGroups.length > 1 && (
              <p className="text-[13px] text-[#6b7785]">Drag a group by the handle. The top group is shown first on the website.</p>
            )}
            {shownGroups.map((category, index) => {
              const group = items.filter((item) => (item.category || "General") === category);
              return (
                <div key={category} ref={groupDrag.itemRef(index)} style={shownGroups.length > 1 ? groupDrag.itemStyle(index) : undefined}>
                  <div className="mb-2 flex items-center gap-2">
                    {shownGroups.length > 1 && (
                      <span
                        onPointerDown={(event) => groupDrag.onGripPointerDown(index, event)}
                        className="inline-flex h-8 w-6 cursor-grab touch-none items-center justify-center text-[#98a3b1] active:cursor-grabbing"
                        aria-label={`Drag ${category}`}
                        title="Drag to reorder this group"
                      >
                        <GripVertical className="h-4 w-4" />
                      </span>
                    )}
                    <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[#5b6775]">{category}</h3>
                  </div>
                  <ItemList
                    showImages
                    items={group.map((i) => ({ id: i.id, title: i.title, image: i.image_path, status: i.status }))}
                    onEdit={(id) => setEditing(items.find((i) => i.id === id) ?? null)}
                    onDelete={canDelete ? remove : undefined}
                    onReorder={(from, to) => move(category, from, to)}
                    emptyText="No services in this category."
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>


      <div className="grid items-start gap-4 xl:grid-cols-2">
        <FormSection title="Page introduction" description="The paragraph at the top of the Services page.">
          <Textarea className="min-h-[120px]" value={intro} onChange={(e) => setIntro(e.target.value)} />
          <Button onClick={() => saveSettings("intro")} disabled={saving === "intro"}>
            {saving === "intro" ? "Saving…" : "Save introduction"}
          </Button>
        </FormSection>

        <FormSection title="Documents" description="Brochures, charters and forms that can be attached to services.">
          <RowList
            items={docs}
            onChange={setDocs}
            newItem={() => ({ key: "", title: "", href: "" })}
            addLabel="Add document"
            emptyText="No documents yet."
            renderRow={(doc, update) => (
              <div className="space-y-3">
                <Field label="Document name">
                  <Input value={doc.title} onChange={(e) => update({ title: e.target.value })} placeholder="e.g. KSL Brochure" />
                </Field>
                <FileField module="services" value={doc.href} onChange={(href) => update({ href })} />
              </div>
            )}
          />
          <Button onClick={() => saveSettings("documents")} disabled={saving === "documents"}>
            {saving === "documents" ? "Saving…" : "Save documents"}
          </Button>
        </FormSection>
      </div>
    </div>
  );
}
