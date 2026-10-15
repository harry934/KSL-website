"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { ServiceRow } from "@/lib/services";
import { slugify } from "@/lib/services";

type SettingsState = {
  intro: string;
  download_catalog: Record<string, { title: string; href: string }>;
};

export function ServicesEditor() {
  const [intro, setIntro] = useState("");
  const [catalogJson, setCatalogJson] = useState("{}");
  const [items, setItems] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<ServiceRow> & { downloadsText?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/services");
    const data = await res.json();
    if (res.ok) {
      setIntro(data.intro ?? "");
      setCatalogJson(JSON.stringify(data.download_catalog ?? {}, null, 2));
      setItems(data.items ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveSettings() {
    setSaving(true);
    setMessage(null);
    let download_catalog: SettingsState["download_catalog"] = {};
    try {
      download_catalog = JSON.parse(catalogJson);
    } catch {
      setSaving(false);
      setMessage("Download catalog must be valid JSON");
      return;
    }
    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: "settings", intro, download_catalog }),
    });
    setSaving(false);
    if (res.ok) setMessage("Settings saved");
  }

  function startNew() {
    setEditing({
      title: "",
      slug: "",
      category: "",
      excerpt: "",
      detail: "",
      image_path: "",
      downloadsText: "",
      sort_order: items.length,
      status: "draft",
    });
  }

  async function saveItem() {
    if (!editing?.title) return;
    setSaving(true);
    setMessage(null);
    const downloads = (editing.downloadsText ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const payload = {
      ...editing,
      slug: editing.slug || slugify(editing.title),
      downloads,
    };
    delete (payload as { downloadsText?: string }).downloadsText;
    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      setMessage("Saved");
      setEditing(null);
      load();
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this service?")) return;
    await fetch("/api/services?id=" + encodeURIComponent(id), { method: "DELETE" });
    load();
  }

  async function uploadImage(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", headers: { "x-ksl-module": "services" }, body: fd });
    const data = await res.json();
    if (res.ok) {
      setEditing((e) => (e ? { ...e, image_path: data.public_url } : e));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[#5c6578]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading services…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && <p className="text-sm font-medium text-[#0165FC]">{message}</p>}

      <div className="ksl-card space-y-4 p-6">
        <h2 className="ksl-display text-lg font-semibold text-[#09296C]">Page intro</h2>
        <textarea
          className="min-h-[80px] w-full rounded border border-[#DDE5F0] bg-white px-3 py-2 text-sm"
          value={intro}
          onChange={(e) => setIntro(e.target.value)}
        />
        <div>
          <label className="mb-1 block text-xs font-medium text-[#5c6578]">Download catalog (JSON)</label>
          <textarea
            className="min-h-[120px] w-full rounded border border-[#DDE5F0] bg-white px-3 py-2 font-mono text-xs"
            value={catalogJson}
            onChange={(e) => setCatalogJson(e.target.value)}
          />
        </div>
        <Button type="button" onClick={saveSettings} disabled={saving}>Save settings</Button>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button type="button" onClick={startNew}>
          <Plus className="h-4 w-4" /> New service
        </Button>
      </div>

      {editing && (
        <div className="ksl-card space-y-4 p-6">
          <h2 className="ksl-display text-lg font-semibold text-[#09296C]">
            {editing.id ? "Edit service" : "New service"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-[#5c6578]">Title</label>
              <Input
                value={editing.title ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, title: e.target.value, slug: slugify(e.target.value) })
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5c6578]">Slug</label>
              <Input value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5c6578]">Category</label>
              <Input value={editing.category ?? ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-[#5c6578]">Excerpt</label>
              <Input value={editing.excerpt ?? ""} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5c6578]">Sort order</label>
              <Input
                type="number"
                value={editing.sort_order ?? 0}
                onChange={(e) => setEditing({ ...editing, sort_order: parseInt(e.target.value, 10) || 0 })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5c6578]">Status</label>
              <select
                className="w-full rounded border border-[#DDE5F0] bg-white px-3 py-2.5 text-sm"
                value={editing.status ?? "draft"}
                onChange={(e) => setEditing({ ...editing, status: e.target.value })}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-[#5c6578]">Download keys (comma-separated)</label>
              <Input
                value={editing.downloadsText ?? (editing.downloads || []).join(", ")}
                onChange={(e) => setEditing({ ...editing, downloadsText: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-[#5c6578]">Image</label>
              <Input
                value={editing.image_path ?? ""}
                onChange={(e) => setEditing({ ...editing, image_path: e.target.value })}
              />
              <input
                type="file"
                accept="image/*"
                className="mt-2 text-sm"
                onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-[#5c6578]">Detail (modal text)</label>
              <textarea
                className="min-h-[200px] w-full rounded border border-[#DDE5F0] bg-white px-3 py-2 text-sm"
                value={editing.detail ?? ""}
                onChange={(e) => setEditing({ ...editing, detail: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button type="button" onClick={saveItem} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="ksl-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F7F9FB] text-xs uppercase text-[#5c6578]">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-[#EEF3FA]">
                <td className="px-4 py-3 font-medium text-[#09296C]">{item.title}</td>
                <td className="px-4 py-3 text-[#5c6578]">{item.category}</td>
                <td className="px-4 py-3 text-[#5c6578]">{item.sort_order}</td>
                <td className="px-4 py-3 capitalize text-[#5c6578]">{item.status}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    className="text-[#0165FC] hover:underline"
                    onClick={() =>
                      setEditing({
                        ...item,
                        downloadsText: (item.downloads || []).join(", "),
                      })
                    }
                  >
                    Edit
                  </button>
                  <button type="button" className="ml-3 text-red-600" onClick={() => remove(item.id)} aria-label="Delete">
                    <Trash2 className="inline h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
