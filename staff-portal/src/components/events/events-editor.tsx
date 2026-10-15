"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { EventRow } from "@/lib/events";
import { slugify } from "@/lib/events";

export function EventsEditor() {
  const [items, setItems] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<EventRow> | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/events");
    const data = await res.json();
    if (res.ok) setItems(data.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startNew() {
    setEditing({
      title: "",
      slug: "",
      theme: "",
      event_date: new Date().toISOString().slice(0, 10),
      time_start: "",
      time_end: "",
      timezone: "Africa/Nairobi",
      venue: "",
      description: "",
      summary: "",
      image_path: "",
      body_html: "",
      status: "draft",
    });
  }

  async function save() {
    if (!editing?.title || !editing.event_date) return;
    setSaving(true);
    setMessage(null);
    const payload = {
      ...editing,
      slug: editing.slug || slugify(editing.title),
    };
    const res = await fetch("/api/events", {
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
    if (!confirm("Delete this event?")) return;
    await fetch("/api/events?id=" + encodeURIComponent(id), { method: "DELETE" });
    load();
  }

  async function uploadImage(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", headers: { "x-ksl-module": "events" }, body: fd });
    const data = await res.json();
    if (res.ok) {
      setEditing((e) => (e ? { ...e, image_path: data.public_url } : e));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[#5b6775]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading events…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {message && <p className="text-sm font-medium text-[#0b1f3a]">{message}</p>}
        <Button type="button" onClick={startNew}>
          <Plus className="h-4 w-4" /> New event
        </Button>
      </div>

      {editing && (
        <div className="ksl-card space-y-4 p-6">
          <h2 className="text-[15px] font-bold text-[#0b1f3a]">
            {editing.id ? "Edit event" : "New event"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-[#5b6775]">Title</label>
              <Input
                value={editing.title ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, title: e.target.value, slug: slugify(e.target.value) })
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5b6775]">Slug</label>
              <Input value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5b6775]">Event date</label>
              <Input
                type="date"
                value={editing.event_date ?? ""}
                onChange={(e) => setEditing({ ...editing, event_date: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-[#5b6775]">Theme / tagline</label>
              <Input value={editing.theme ?? ""} onChange={(e) => setEditing({ ...editing, theme: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5b6775]">Start time (HH:MM)</label>
              <Input value={editing.time_start ?? ""} onChange={(e) => setEditing({ ...editing, time_start: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5b6775]">End time (HH:MM)</label>
              <Input value={editing.time_end ?? ""} onChange={(e) => setEditing({ ...editing, time_end: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-[#5b6775]">Venue</label>
              <Input value={editing.venue ?? ""} onChange={(e) => setEditing({ ...editing, venue: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-[#5b6775]">Short description</label>
              <Input
                value={editing.description ?? ""}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-[#5b6775]">Summary (past events)</label>
              <Input value={editing.summary ?? ""} onChange={(e) => setEditing({ ...editing, summary: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5b6775]">Status</label>
              <select
                className="w-full rounded border border-[#d7dde5] bg-white px-3 py-2.5 text-sm"
                value={editing.status ?? "draft"}
                onChange={(e) => setEditing({ ...editing, status: e.target.value })}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-[#5b6775]">Cover image</label>
              <Input
                value={editing.image_path ?? ""}
                onChange={(e) => setEditing({ ...editing, image_path: e.target.value })}
                placeholder="URL or upload below"
              />
              <input
                type="file"
                accept="image/*"
                className="mt-2 text-sm"
                onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-[#5b6775]">Body (HTML)</label>
              <textarea
                className="min-h-[200px] w-full rounded border border-[#d7dde5] bg-white px-3 py-2 text-sm"
                value={editing.body_html ?? ""}
                onChange={(e) => setEditing({ ...editing, body_html: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button type="button" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="ksl-card overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[13px]">
          <thead className="bg-[#f4f6f8] text-xs uppercase text-[#5b6775]">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Venue</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-[#eef2f6]">
                <td className="px-4 py-3 font-medium text-[#0b1f3a]">{item.title}</td>
                <td className="px-4 py-3 text-[#5b6775]">{item.event_date}</td>
                <td className="px-4 py-3 text-[#5b6775]">{item.venue}</td>
                <td className="px-4 py-3 capitalize text-[#5b6775]">{item.status}</td>
                <td className="px-4 py-3 text-right">
                  <button type="button" className="text-[#0b1f3a] hover:underline" onClick={() => setEditing(item)}>
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
