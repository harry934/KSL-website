"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { CareerListingRow } from "@/lib/careers";

type Settings = { apply_email: string; apply_note: string | null };

export function CareersEditor() {
  const [settings, setSettings] = useState<Settings>({ apply_email: "", apply_note: "" });
  const [listings, setListings] = useState<CareerListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<CareerListingRow> | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/careers");
    const data = await res.json();
    if (res.ok) {
      setSettings({
        apply_email: data.settings?.apply_email ?? "",
        apply_note: data.settings?.apply_note ?? "",
      });
      setListings(data.listings ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveSettings() {
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/careers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: "settings", ...settings }),
    });
    setSaving(false);
    if (res.ok) setMessage("Settings saved");
  }

  function startNew(kind: "vacancy" | "internship") {
    setEditing({
      kind,
      title: "",
      location: "",
      summary: "",
      closing_date: "",
      apply_url: "",
      sort_order: listings.length,
      status: "draft",
    });
  }

  async function saveListing() {
    if (!editing?.title) return;
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/careers", {
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
    if (!confirm("Delete this listing?")) return;
    await fetch("/api/careers?id=" + encodeURIComponent(id), { method: "DELETE" });
    load();
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[#5b6775]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading careers…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && <p className="text-sm font-medium text-[#0b1f3a]">{message}</p>}

      <div className="ksl-card space-y-4 p-6">
        <h2 className="text-[15px] font-bold text-[#0b1f3a]">Application guidance</h2>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#5b6775]">Apply email</label>
          <Input
            value={settings.apply_email}
            onChange={(e) => setSettings({ ...settings, apply_email: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#5b6775]">How to apply (note)</label>
          <textarea
            className="min-h-[80px] w-full rounded border border-[#d7dde5] bg-white px-3 py-2 text-sm"
            value={settings.apply_note ?? ""}
            onChange={(e) => setSettings({ ...settings, apply_note: e.target.value })}
          />
        </div>
        <Button type="button" onClick={saveSettings} disabled={saving}>Save settings</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={() => startNew("vacancy")}>
          <Plus className="h-4 w-4" /> Vacancy
        </Button>
        <Button type="button" variant="ghost" onClick={() => startNew("internship")}>
          <Plus className="h-4 w-4" /> Internship
        </Button>
      </div>

      {editing && (
        <div className="ksl-card space-y-4 p-6">
          <h2 className="text-[15px] font-bold text-[#0b1f3a]">
            {editing.id ? "Edit" : "New"} {editing.kind === "internship" ? "internship" : "vacancy"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-[#5b6775]">Title</label>
              <Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-[#5b6775]">Location</label>
              <Input value={editing.location ?? ""} onChange={(e) => setEditing({ ...editing, location: e.target.value })} />
            </div>
            {editing.kind === "vacancy" && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#5b6775]">Closing date</label>
                  <Input
                    type="date"
                    value={editing.closing_date ?? ""}
                    onChange={(e) => setEditing({ ...editing, closing_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#5b6775]">Apply URL (optional)</label>
                  <Input value={editing.apply_url ?? ""} onChange={(e) => setEditing({ ...editing, apply_url: e.target.value })} />
                </div>
              </>
            )}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-[#5b6775]">Summary</label>
              <textarea
                className="min-h-[100px] w-full rounded border border-[#d7dde5] bg-white px-3 py-2 text-sm"
                value={editing.summary ?? ""}
                onChange={(e) => setEditing({ ...editing, summary: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5b6775]">Sort order</label>
              <Input
                type="number"
                value={editing.sort_order ?? 0}
                onChange={(e) => setEditing({ ...editing, sort_order: parseInt(e.target.value, 10) || 0 })}
              />
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
          </div>
          <div className="flex gap-3">
            <Button type="button" onClick={saveListing} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="ksl-card overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[13px]">
          <thead className="bg-[#f4f6f8] text-xs uppercase text-[#5b6775]">
            <tr>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {listings.map((item) => (
              <tr key={item.id} className="border-t border-[#eef2f6]">
                <td className="px-4 py-3 capitalize text-[#5b6775]">{item.kind}</td>
                <td className="px-4 py-3 font-medium text-[#0b1f3a]">{item.title}</td>
                <td className="px-4 py-3 text-[#5b6775]">{item.location}</td>
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
