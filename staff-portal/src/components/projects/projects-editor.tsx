"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GripVertical, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageField } from "@/components/ui/image-field";
import { ItemList } from "@/components/ui/item-list";
import { Field, FormSection, SaveBar, ChoiceField, VisibilitySwitch, Textarea } from "@/components/ui/form-bits";
import { useFeedback } from "@/components/ui/feedback";
import { slugify } from "@/lib/news";
import { orderedGroups, reorderItem, uniqueSlug } from "@/lib/list-utils";
import { useLiveDrag } from "@/components/ui/live-drag";
import { sendJson, awaitingReview, DRAFT_SAVED } from "@/lib/upload-client";
import { PROJECT_GROUPS, type ProjectRow } from "@/lib/projects";
import { projectPublicUrl } from "@/lib/public-links";
import { useOpenEdit } from "@/lib/open-edit";
import { appPath } from "@/lib/base-path";

export function ProjectsEditor({ canPublish, canDelete }: { canPublish: boolean; canDelete: boolean }) {
  const { toast, confirm } = useFeedback();
  const [items, setItems] = useState<ProjectRow[]>([]);
  const [groupOrder, setGroupOrder] = useState<string[]>([]);
  const [editing, setEditing] = useState<Partial<ProjectRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(appPath("/api/projects"));
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setItems(data.items ?? []);
      setGroupOrder(Array.isArray(data.group_order) ? data.group_order : []);
    } else toast(data.error ?? "Could not load the projects.", "error");
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  useOpenEdit(loading, items, (item) => setEditing(item));

  const groups = useMemo(() => {
    const seen = new Set<string>();
    const list: { value: string; label: string }[] = [];
    for (const item of items) {
      if (seen.has(item.category)) continue;
      seen.add(item.category);
      const known = PROJECT_GROUPS.find((group) => group.value === item.category);
      list.push({ value: item.category, label: known?.label || item.category_label || item.category });
    }
    return list;
  }, [items]);

  const ordered = useMemo(() => {
    const byValue = new Map(groups.map((group) => [group.value, group]));
    return orderedGroups(groups.map((group) => group.value), groupOrder)
      .map((value) => byValue.get(value))
      .filter((group): group is { value: string; label: string } => !!group);
  }, [groups, groupOrder]);

  const groupDrag = useLiveDrag((from, to) => {
    const next = reorderItem(ordered, from, to).map((group) => group.value);
    setGroupOrder(next);
    void sendJson("/api/projects", "POST", { scope: "groups", group_order: next }).catch((err) => {
      toast((err as Error).message, "error");
      void load();
    });
  });

  const groupChoices = useMemo(() => {
    const map = new Map<string, string>();
    for (const group of PROJECT_GROUPS) map.set(group.label, group.value);
    for (const group of groups) map.set(group.label, group.value);
    return [...map.entries()].map(([label, value]) => ({ value: label, slug: value, label }));
  }, [groups]);

  function startNew() {
    setEditing({
      title: "",
      subtitle: "",
      details: "",
      category: PROJECT_GROUPS[0].value,
      category_label: PROJECT_GROUPS[0].label,
      image_path: "",
      sort_order: items.length ? Math.max(...items.map((item) => item.sort_order)) + 1 : 0,
      status: canPublish ? "published" : "draft",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveItem(event: React.FormEvent) {
    event.preventDefault();
    if (!editing?.title?.trim()) {
      toast("Give the project a name.", "error");
      return;
    }
    const label = (editing.category_label || "").trim();
    if (!label) {
      toast("Choose a group, or type a new one.", "error");
      return;
    }
    const known = groupChoices.find((group) => group.label === label);
    const category = known?.slug || slugify(label);
    setSaving(true);
    try {
      const slug =
        editing.slug?.trim() ||
        uniqueSlug(editing.title, items.filter((item) => item.id !== editing.id).map((item) => item.slug), "project");
      const saved = await sendJson("/api/projects", "POST", {
        ...editing,
        slug: slug || slugify(editing.title),
        category,
        category_label: label,
      });
      toast(awaitingReview(saved) ? DRAFT_SAVED : editing.status === "published" ? "Project saved and shown on the website." : "Project saved as hidden (draft).");
      setEditing(null);
      load();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function move(category: string, from: number, to: number) {
    const group = items.filter((item) => item.category === category);
    const updated = reorderItem(group, from, to).map((item, index) => ({ ...item, sort_order: index }));
    const before = new Map(group.map((item) => [item.id, item.sort_order]));
    const byId = new Map(updated.map((item) => [item.id, item]));
    setItems((list) => list.map((item) => byId.get(item.id) ?? item));
    try {
      await Promise.all(updated.filter((item) => before.get(item.id) !== item.sort_order).map((item) => sendJson("/api/projects", "POST", item)));
    } catch (err) {
      toast((err as Error).message, "error");
      load();
    }
  }

  async function remove(id: string) {
    const item = items.find((row) => row.id === id);
    const ok = await confirm({
      title: "Delete this project?",
      message: item ? `"${item.title}" leaves the website and goes to the recycle bin.` : "It goes to the recycle bin.",
      confirmLabel: "Delete project",
      danger: true,
    });
    if (!ok) return;
    try {
      await sendJson(`/api/projects?id=${encodeURIComponent(id)}`, "DELETE");
      toast("Project moved to the recycle bin.");
      load();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[14px] text-[#5b6775]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading projects…
      </div>
    );
  }

  if (editing) {
    const set = (patch: Partial<ProjectRow>) => setEditing({ ...editing, ...patch });
    return (
      <form onSubmit={saveItem} className="space-y-4">
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <FormSection title={editing.id ? "Edit project" : "New project"}>
            <Field label="Project name">
              <Input value={editing.title ?? ""} onChange={(event) => set({ title: event.target.value })} autoFocus={!editing.id} />
            </Field>
            <Field label="Short line" hint="Shown under the name, for example New build.">
              <Input value={editing.subtitle ?? ""} onChange={(event) => set({ subtitle: event.target.value })} />
            </Field>
            <Field
              label="Project details"
              hint="Optional. When filled in, the website card shows Read more with a ship icon. Leave blank to hide that control."
            >
              <Textarea
                value={editing.details ?? ""}
                onChange={(event) => set({ details: event.target.value })}
                rows={8}
                placeholder="What was built or repaired, client, scope, and outcome…"
              />
            </Field>
            <Field label="Group">
              <ChoiceField
                value={editing.category_label ?? ""}
                options={groupChoices.map((group) => ({ value: group.label, label: group.label }))}
                onChange={(label) => {
                  const known = groupChoices.find((group) => group.label === label);
                  set({ category_label: label, category: known?.slug || slugify(label) });
                }}
                newLabel="Add a new group…"
              />
            </Field>
          </FormSection>
          <div className="space-y-4">
            <FormSection title="Photo">
              <ImageField module="projects" value={editing.image_path ?? ""} onChange={(image_path) => set({ image_path })} />
            </FormSection>
            <FormSection title="Visibility">
              <VisibilitySwitch status={editing.status ?? "draft"} canPublish={canPublish} onChange={(status) => set({ status })} />
            </FormSection>
          </div>
        </div>
        <SaveBar>
          {editing.status === "published" && editing.category && (
            <a href={projectPublicUrl(editing.category)} target="_blank" rel="noreferrer" className="mr-auto text-[13.5px] font-semibold text-[#0b1f3a] underline-offset-2 hover:underline">
              View on the website
            </a>
          )}
          <Button variant="secondary" onClick={() => setEditing(null)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </SaveBar>
      </form>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={startNew}>
          <Plus className="h-4 w-4" /> New project
        </Button>
      </div>
      {ordered.length > 1 && (
        <p className="text-[13px] text-[#6b7785]">Drag a group by the handle. The top group is shown first on the website.</p>
      )}
      {ordered.map((group, index) => (
        <div key={group.value} ref={groupDrag.itemRef(index)} style={ordered.length > 1 ? groupDrag.itemStyle(index) : undefined}>
          <div className="mb-3 flex items-center gap-2">
            {ordered.length > 1 && (
              <span
                onPointerDown={(event) => groupDrag.onGripPointerDown(index, event)}
                className="inline-flex h-8 w-6 cursor-grab touch-none items-center justify-center text-[#98a3b1] active:cursor-grabbing"
                aria-label={`Drag ${group.label}`}
                title="Drag to reorder this group"
              >
                <GripVertical className="h-4 w-4" />
              </span>
            )}
            <h2 className="text-[15px] font-bold text-[#0b1f3a]">{group.label}</h2>
          </div>
          <ItemList
            showImages
            items={items
              .filter((item) => item.category === group.value)
              .map((item) => ({
                id: item.id,
                title: item.title,
                subtitle: item.subtitle,
                image: item.image_path,
                status: item.status,
                siteHref: item.status === "published" ? projectPublicUrl(item.category) : undefined,
              }))}
            onEdit={(id) => setEditing(items.find((item) => item.id === id) ?? null)}
            onDelete={canDelete ? remove : undefined}
            onReorder={(from, to) => move(group.value, from, to)}
            emptyText="No projects in this group."
          />
        </div>
      ))}
    </div>
  );
}
