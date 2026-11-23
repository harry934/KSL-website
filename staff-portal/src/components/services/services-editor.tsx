"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GripVertical, Loader2, Plus, Trash2 } from "lucide-react";
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
import { ImageField } from "@/components/ui/image-field";
import { ItemList } from "@/components/ui/item-list";
import { useFeedback } from "@/components/ui/feedback";
import { useCan } from "@/components/portal/session-context";
import {
  actionsFromPopupButtons,
  cleanModalActions,
  DEFAULT_SERVICE_MODAL_ACTIONS,
  popupButtonsFromActions,
  resolveServiceActions,
  serviceDownloadRows,
  SERVICE_GROUPS,
  type ServiceDownloadDraft,
  type ServiceModalAction,
  type ServiceModalActions,
  type ServiceRow,
} from "@/lib/services";
import { orderedGroups, reorderItem, uniqueSlug } from "@/lib/list-utils";
import { useLiveDrag } from "@/components/ui/live-drag";
import { sendJson, awaitingReview, DRAFT_SAVED } from "@/lib/upload-client";
import { useOpenEdit } from "@/lib/open-edit";
import { appPath } from "@/lib/base-path";

type ServiceDraft = Partial<ServiceRow> & {
  popupButtons: ServiceModalAction[];
  downloadRows: ServiceDownloadDraft[];
};

function downloadKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

const BUTTON_NAMES = ["Main button", "Second button", "Text link"];

const PAGE_OPTIONS = [
  { value: "contact.html", label: "Contact" },
  { value: "project.html", label: "Projects" },
  { value: "downloads.html", label: "Downloads" },
  { value: "service.html", label: "Services" },
  { value: "about.html", label: "About" },
  { value: "careers.html", label: "Careers" },
  { value: "news.html", label: "News" },
];

function serviceCategories(items: ServiceRow[]) {
  const names: string[] = [];
  for (const item of items) {
    const name = item.category || "General";
    if (!names.includes(name)) names.push(name);
  }
  return names;
}

export function ServicesEditor() {
  const { toast, confirm } = useFeedback();
  const canPublish = useCan("services", "publish");
  const canDelete = useCan("services", "delete");
  const [intro, setIntro] = useState("");
  const [savedCatalog, setSavedCatalog] = useState<Record<string, { title: string; href: string }>>({});
  const [modalActions, setModalActions] = useState<ServiceModalActions>(DEFAULT_SERVICE_MODAL_ACTIONS);
  const [items, setItems] = useState<ServiceRow[]>([]);
  const [groupOrder, setGroupOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ServiceDraft | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(appPath("/api/services"));
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setIntro(data.intro ?? "");
      setSavedCatalog(data.download_catalog ?? {});
      setModalActions(cleanModalActions(data.modal_actions ?? null, true));
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

  useOpenEdit(loading, items, (item) => openEdit(item));

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

  async function saveIntro() {
    setSaving("intro");
    try {
      const saved = await sendJson("/api/services", "POST", {
        scope: "settings",
        intro,
        download_catalog: savedCatalog,
        modal_actions: modalActions,
      });
      toast(awaitingReview(saved) ? DRAFT_SAVED : "Introduction saved.");
      window.setTimeout(() => document.getElementById("services-intro")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
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
      popupButtons: popupButtonsFromActions(modalActions),
      downloadRows: [],
      sort_order: items.length ? Math.max(...items.map((i) => i.sort_order)) + 1 : 0,
      status: canPublish ? "published" : "draft",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openEdit(item: ServiceRow & { download_rows?: unknown }) {
    const actions = resolveServiceActions(item.actions, modalActions);
    const downloadRows = (Array.isArray(item.download_rows)
      ? item.download_rows.flatMap((row) => {
          if (!row || typeof row !== "object") return [];
          const record = row as ServiceDownloadDraft;
          return [{ key: String(record.key ?? ""), title: String(record.title ?? ""), href: String(record.href ?? "") }];
        })
      : serviceDownloadRows(item.downloads, savedCatalog)
    );
    setEditing({
      ...item,
      actions,
      popupButtons: popupButtonsFromActions(actions),
      downloadRows,
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
      const downloadRows = editing.downloadRows.filter((doc) => doc.key.trim() && doc.title.trim() && doc.href.trim());
      const incompleteButton = editing.popupButtons.find((button) => button.label.trim() && !button.href.trim());
      if (incompleteButton) {
        toast("Each popup button needs a label and a page.", "error");
        setSaving(null);
        return;
      }
      const actions = actionsFromPopupButtons(editing.popupButtons);
      const slug =
        editing.slug?.trim() ||
        uniqueSlug(editing.title, items.filter((i) => i.id !== editing.id).map((i) => i.slug), "service");
      const saved = await sendJson("/api/services", "POST", {
        ...editing,
        slug,
        actions,
        download_rows: downloadRows,
        downloads: downloadRows.map((doc) => doc.key),
      });
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
    const set = (patch: Partial<ServiceDraft>) => setEditing({ ...editing, ...patch });
    const setButton = (index: number, patch: Partial<ServiceModalAction>) => {
      set({
        popupButtons: editing.popupButtons.map((button, i) => (i === index ? { ...button, ...patch } : button)),
      });
    };
    const library = Object.entries(savedCatalog).map(([key, value]) => ({
      key,
      title: value?.title?.trim() || key,
      href: value?.href?.trim() || "",
    }));
    const selected = new Set(editing.downloadRows.map((doc) => downloadKey(doc.key)));
    const toggleDownload = (doc: ServiceDownloadDraft) => {
      const key = downloadKey(doc.key);
      const on = selected.has(key);
      set({
        downloadRows: on
          ? editing.downloadRows.filter((row) => downloadKey(row.key) !== key)
          : [...editing.downloadRows.filter((row) => downloadKey(row.key) !== key), doc],
      });
    };
    return (
      <form onSubmit={saveItem} className="space-y-4">
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
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
            <FormSection
              title="Popup buttons"
              description="These are the buttons at the bottom of this service’s popup. The first is the main button, the second is the outline button, and the third is a text link. Remove any you do not want."
            >
              {editing.popupButtons.length === 0 && (
                <p className="text-[13.5px] text-[#6b7785]">No buttons on this popup. Add one if visitors need a next step.</p>
              )}
              <div className="space-y-3">
                {editing.popupButtons.map((button, index) => (
                  <div key={index} className="rounded-[8px] border border-[#e3e8ee] bg-[#fafbfc] p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#5b6775]">{BUTTON_NAMES[index] ?? "Button"}</p>
                      <button
                        type="button"
                        onClick={() => set({ popupButtons: editing.popupButtons.filter((_, i) => i !== index) })}
                        className="inline-flex h-8 items-center gap-1.5 rounded-[6px] px-2 text-[13px] font-semibold text-[#b42318] hover:bg-[#fdecea]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Label">
                        <Input
                          value={button.label}
                          onChange={(e) => setButton(index, { label: e.target.value })}
                          placeholder="e.g. Request a quote"
                        />
                      </Field>
                      <Field label="Goes to">
                        <ChoiceField
                          value={button.href || "contact.html"}
                          options={PAGE_OPTIONS}
                          onChange={(href) => setButton(index, { href })}
                          newLabel="Custom page or link…"
                        />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
              {editing.popupButtons.length < 3 && (
                <Button
                  variant="secondary"
                  onClick={() => set({ popupButtons: [...editing.popupButtons, { label: "", href: "contact.html" }] })}
                >
                  <Plus className="h-4 w-4" /> Add button
                </Button>
              )}
            </FormSection>
            <FormSection
              title="Related downloads"
              description="Tick the documents that should appear in this service’s popup."
            >
              {library.length === 0 ? (
                <p className="text-[13.5px] text-[#6b7785]">No documents are available yet.</p>
              ) : (
                <ul className="divide-y divide-[#e6ebf1] rounded-[8px] border border-[#e3e8ee]">
                  {library.map((doc) => {
                    const on = selected.has(downloadKey(doc.key));
                    return (
                      <li key={doc.key}>
                        <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-[14px] text-[#0b1f3a]">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-[#0b1f3a]"
                            checked={on}
                            onChange={() => toggleDownload(doc)}
                          />
                          <span className="font-medium">{doc.title}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </FormSection>
          </div>
          <div className="space-y-4">
            <FormSection title="Visibility">
              <VisibilitySwitch status={editing.status ?? "draft"} canPublish={canPublish} onChange={(status) => set({ status })} />
            </FormSection>
            <FormSection title="Photo">
              <ImageField module="services" value={editing.image_path ?? ""} onChange={(image_path) => set({ image_path })} />
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
                    items={group.map((item) => {
                      const documents = Array.isArray(item.downloads) ? item.downloads.length : 0;
                      const buttons = popupButtonsFromActions(resolveServiceActions(item.actions, modalActions)).length;
                      return {
                        id: item.id,
                        title: item.title,
                        image: item.image_path,
                        status: item.status,
                        subtitle: `${documents} document${documents === 1 ? "" : "s"} · ${buttons} button${buttons === 1 ? "" : "s"}`,
                      };
                    })}
                    onEdit={(id) => {
                      const found = items.find((i) => i.id === id);
                      if (found) openEdit(found);
                    }}
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

      <div id="services-intro" className="scroll-mt-24">
        <FormSection title="Page introduction" description="The paragraph at the top of the Services page. Leave a blank line between paragraphs.">
          <Textarea className="min-h-[120px]" value={intro} onChange={(e) => setIntro(e.target.value)} />
          <Button onClick={saveIntro} disabled={saving === "intro"}>
            {saving === "intro" ? "Saving…" : "Save introduction"}
          </Button>
        </FormSection>
      </div>
    </div>
  );
}
