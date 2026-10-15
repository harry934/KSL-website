"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { PressAssetRow } from "@/lib/press";

export function PressEditor() {
  const [boilerplate, setBoilerplate] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [assets, setAssets] = useState<PressAssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<PressAssetRow> | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/press");
    const data = await res.json();
    if (res.ok) {
      setBoilerplate(data.settings?.boilerplate ?? "");
      setContactEmail(data.settings?.contact_email ?? "");
      setContactPhone(data.settings?.contact_phone ?? "");
      setAssets(data.assets ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveSettings() {
    setSaving(true);
    const res = await fetch("/api/press", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scope: "settings",
        boilerplate,
        contact_email: contactEmail,
        contact_phone: contactPhone,
      }),
    });
    setSaving(false);
    if (res.ok) setMessage("Settings saved");
  }

  function startNew() {
    setEditing({
      title: "",
      href: "",
      download_id: "",
      asset_type: "Link",
      sort_order: assets.length,
      status: "draft",
    });
  }

  async function saveAsset() {
    if (!editing?.title) return;
    setSaving(true);
    const res = await fetch("/api/press", {
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
    if (!confirm("Delete this asset?")) return;
    await fetch("/api/press?id=" + encodeURIComponent(id), { method: "DELETE" });
    load();
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[#5b6775]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading press kit…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && <p className="text-sm font-medium text-[#0b1f3a]">{message}</p>}

      <div className="ksl-card space-y-4 p-6">
        <h2 className="text-[15px] font-bold text-[#0b1f3a]">Press contact</h2>
        <textarea
          className="min-h-[80px] w-full rounded border border-[#d7dde5] bg-white px-3 py-2 text-sm"
          value={boilerplate}
          onChange={(e) => setBoilerplate(e.target.value)}
          placeholder="Boilerplate"
        />
        <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Email" />
        <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Phone" />
        <Button type="button" onClick={saveSettings} disabled={saving}>Save settings</Button>
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={startNew}><Plus className="h-4 w-4" /> Asset</Button>
      </div>

      {editing && (
        <div className="ksl-card space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-[#5b6775]">Title</label>
              <Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5b6775]">Link URL</label>
              <Input value={editing.href ?? ""} onChange={(e) => setEditing({ ...editing, href: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5b6775]">Download ID (optional)</label>
              <Input value={editing.download_id ?? ""} onChange={(e) => setEditing({ ...editing, download_id: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5b6775]">Type label</label>
              <Input value={editing.asset_type ?? ""} onChange={(e) => setEditing({ ...editing, asset_type: e.target.value })} />
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
            <Button type="button" onClick={saveAsset} disabled={saving}>Save</Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="ksl-card overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[13px]">
          <thead className="bg-[#f4f6f8] text-xs uppercase text-[#5b6775]">
            <tr><th className="px-4 py-3">Title</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Status</th><th /></tr>
          </thead>
          <tbody>
            {assets.map((item) => (
              <tr key={item.id} className="border-t border-[#eef2f6]">
                <td className="px-4 py-3 font-medium text-[#0b1f3a]">{item.title}</td>
                <td className="px-4 py-3 text-[#5b6775]">{item.asset_type}</td>
                <td className="px-4 py-3 capitalize text-[#5b6775]">{item.status}</td>
                <td className="px-4 py-3 text-right">
                  <button type="button" className="text-[#0b1f3a] hover:underline" onClick={() => setEditing(item)}>Edit</button>
                  <button type="button" className="ml-3 text-red-600" onClick={() => remove(item.id)} aria-label="Delete"><Trash2 className="inline h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
