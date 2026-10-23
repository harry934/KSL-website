"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageField } from "@/components/ui/image-field";
import { ItemList } from "@/components/ui/item-list";
import { RecycleBin } from "@/components/portal/recycle-bin";
import { Field, FormSection, SaveBar, Select, VisibilitySwitch } from "@/components/ui/form-bits";
import { useFeedback } from "@/components/ui/feedback";
import { slugify } from "@/lib/news";
import { reorderItem, uniqueSlug } from "@/lib/list-utils";
import { sendJson } from "@/lib/upload-client";
import { PROJECT_GROUPS, projectGroup, type ProjectRow } from "@/lib/projects";
import { projectPublicUrl } from "@/lib/public-links";
import { useOpenEdit } from "@/lib/open-edit";

export function ProjectsEditor({ canPublish, canDelete }: { canPublish: boolean; canDelete: boolean }) {
  const { toast, confirm } = useFeedback();
  const [items, setItems] = useState<ProjectRow[]>([]);
  const [removed, setRemoved] = useState<ProjectRow[]>([]);
  const [editing, setEditing] = useState<Partial<ProjectRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/projects");
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setItems(data.items ?? []);
      setRemoved(data.removed ?? []);
    } else toast(data.error ?? "Could not load the projects.", "error");
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  useOpenEdit(loading, items, (item) => setEditing(item));

  const groups = useMemo(() => {
    const present = new Set(items.map((item) => item.category));
    return PROJECT_GROUPS.filter((group) => present.has(group.value));
  }, [items]);

  function startNew() {
    setEditing({
      title: "",
      subtitle: "",
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
    setSaving(true);
    try {
      const group = projectGroup(editing.category);
      const slug =
        editing.slug?.trim() ||
        uniqueSlug(editing.title, items.filter((item) => item.id !== editing.id).map((item) => item.slug), "project");
      await sendJson("/api/projects", "POST", {
        ...editing,
        slug: slug || slugify(editing.title),
        category: group.value,
        category_label: group.label,
      });
      toast(editing.status === "published" ? "Project saved and shown on the website." : "Project saved as hidden (draft).");
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
            <Field label="Group">
              <Select
                value={projectGroup(editing.category).value}
                onChange={(event) => {
                  const group = projectGroup(event.target.value);
                  set({ category: group.value, category_label: group.label });
                }}
              >
                {PROJECT_GROUPS.map((group) => (
                  <option key={group.value} value={group.value}>
                    {group.label}
                  </option>
                ))}
              </Select>
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
      {groups.map((group) => (
        <div key={group.value}>
          <h2 className="mb-3 text-[15px] font-bold text-[#0b1f3a]">{group.label}</h2>
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
      <RecycleBin
        items={removed.map((item) => ({ id: item.id, title: item.title }))}
        onRestore={(id) => {
          sendJson("/api/projects", "POST", { action: "restore", id })
            .then(() => {
              toast("Project restored.");
              load();
            })
            .catch((err) => toast((err as Error).message, "error"));
        }}
        onDelete={(id) => {
          sendJson(`/api/projects?id=${encodeURIComponent(id)}&permanent=1`, "DELETE")
            .then(() => {
              toast("Project deleted.");
              load();
            })
            .catch((err) => toast((err as Error).message, "error"));
        }}
      />
    </div>
  );
}
