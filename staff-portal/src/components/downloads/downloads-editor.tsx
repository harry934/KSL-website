"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { DownloadItemRow } from "@/lib/downloads";

export function DownloadsEditor() {
  const [baseUrl, setBaseUrl] = useState("");
  const [items, setItems] = useState<DownloadItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<DownloadItemRow> | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/downloads");
    const data = await res.json();
    if (res.ok) {
      setBaseUrl(data.settings?.base_url ?? "");
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
    const res = await fetch("/api/downloads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: "settings", base_url: baseUrl }),
    });
    setSaving(false);
    if (res.ok) setMessage("Settings saved");
  }

  function startNew() {
    setEditing({
      id: "",
      title: "",
      subtitle: "",
      category: "plans",
      category_label: "Plans and publications",
      language: "English",
      doc_date: "",
      file_type: "PDF",
      file_name: "",
      anchor: "",
      alias_of: "",
      external_href: "",
      sort_order: items.length,
      status: "draft",
    });
  }

  async function saveItem() {
    if (!editing?.id || !editing.title) return;
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/downloads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    setSaving(false);
    if (res.ok) {
      setMessage("Saved");
      setEditing(null);
      load();
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this document?")) return;
    await fetch("/api/downloads?id=" + encodeURIComponent(id), { method: "DELETE" });
    load();
  }

  async function uploadFile(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", headers: { "x-ksl-module": "downloads" }, body: fd });
    const data = await res.json();
    if (res.ok) {
      setEditing((e) =>
        e ? { ...e, external_href: data.public_url, file_name: file.name } : e
      );
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[#5c6578]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading downloads…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && <p className="text-sm font-medium text-[#0165FC]">{message}</p>}

      <div className="ksl-card space-y-4 p-6">
        <h2 className="ksl-display text-lg font-semibold text-[#09296C]">File base URL</h2>
        <p className="text-sm text-[#5c6578]">
          Prepended to each item&apos;s file name on the public site (e.g. corporate documents folder).
        </p>
        <Input
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://example.com/corporate-documents/"
        />
        <Button type="button" onClick={saveSettings} disabled={saving}>Save settings</Button>
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={startNew}>
          <Plus className="h-4 w-4" /> New document
        </Button>
      </div>

      {editing && (
        <div className="ksl-card space-y-4 p-6">
          <h2 className="ksl-display text-lg font-semibold text-[#09296C]">
            {items.some((i) => i.id === editing.id) ? "Edit document" : "New document"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5c6578]">ID (slug)</label>
              <Input value={editing.id ?? ""} onChange={(e) => setEditing({ ...editing, id: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5c6578]">Anchor (page section)</label>
              <Input value={editing.anchor ?? ""} onChange={(e) => setEditing({ ...editing, anchor: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-[#5c6578]">Title</label>
              <Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-[#5c6578]">Subtitle</label>
              <Input value={editing.subtitle ?? ""} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5c6578]">Category key</label>
              <Input value={editing.category ?? ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5c6578]">Category label</label>
              <Input
                value={editing.category_label ?? ""}
                onChange={(e) => setEditing({ ...editing, category_label: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5c6578]">File name</label>
              <Input value={editing.file_name ?? ""} onChange={(e) => setEditing({ ...editing, file_name: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5c6578]">Full URL override</label>
              <Input
                value={editing.external_href ?? ""}
                onChange={(e) => setEditing({ ...editing, external_href: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5c6578]">Type</label>
              <Input value={editing.file_type ?? ""} onChange={(e) => setEditing({ ...editing, file_type: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5c6578]">Language</label>
              <Input value={editing.language ?? ""} onChange={(e) => setEditing({ ...editing, language: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5c6578]">Date</label>
              <Input value={editing.doc_date ?? ""} onChange={(e) => setEditing({ ...editing, doc_date: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5c6578]">Alias of (id)</label>
              <Input value={editing.alias_of ?? ""} onChange={(e) => setEditing({ ...editing, alias_of: e.target.value })} />
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
              <label className="mb-1 block text-xs font-medium text-[#5c6578]">Upload file (optional)</label>
              <input type="file" className="text-sm" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} />
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
              <th className="px-4 py-3">File</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-[#EEF3FA]">
                <td className="px-4 py-3 font-medium text-[#09296C]">{item.title}</td>
                <td className="px-4 py-3 text-[#5c6578]">{item.category_label}</td>
                <td className="px-4 py-3 text-[#5c6578]">{item.file_name || item.external_href}</td>
                <td className="px-4 py-3 capitalize text-[#5c6578]">{item.status}</td>
                <td className="px-4 py-3 text-right">
                  <button type="button" className="text-[#0165FC] hover:underline" onClick={() => setEditing(item)}>
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
