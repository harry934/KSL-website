"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { LeadershipRow, YardRow } from "@/lib/organization";

type EditLeadership = Partial<LeadershipRow> & { scope?: "leadership" };
type EditYard = Partial<YardRow> & { scope?: "yard" };

export function OrganizationEditor() {
  const [chartDownloadId, setChartDownloadId] = useState("");
  const [leadership, setLeadership] = useState<LeadershipRow[]>([]);
  const [yards, setYards] = useState<YardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditLeadership | EditYard | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/organization");
    const data = await res.json();
    if (res.ok) {
      setChartDownloadId(data.settings?.chart_download_id ?? "");
      setLeadership(data.leadership ?? []);
      setYards(data.yards ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveSettings() {
    setSaving(true);
    const res = await fetch("/api/organization", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: "settings", chart_download_id: chartDownloadId }),
    });
    setSaving(false);
    if (res.ok) setMessage("Settings saved");
  }

  function startLeadership() {
    setEditing({ scope: "leadership", role: "", summary: "", sort_order: leadership.length, status: "draft" });
  }

  function startYard() {
    setEditing({ scope: "yard", name: "", lead: "", summary: "", sort_order: yards.length, status: "draft" });
  }

  async function saveRow() {
    if (!editing) return;
    setSaving(true);
    const scope = editing.scope === "yard" ? "yard" : "leadership";
    const res = await fetch("/api/organization", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editing, scope }),
    });
    setSaving(false);
    if (res.ok) {
      setMessage("Saved");
      setEditing(null);
      load();
    }
  }

  async function remove(id: string, scope: "yard" | "leadership") {
    if (!confirm("Delete this entry?")) return;
    await fetch("/api/organization?id=" + encodeURIComponent(id) + "&scope=" + scope, { method: "DELETE" });
    load();
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[#5b6775]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading organization…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && <p className="text-sm font-medium text-[#0b1f3a]">{message}</p>}

      <div className="ksl-card space-y-4 p-6">
        <h2 className="text-[15px] font-bold text-[#0b1f3a]">Strategic plan download</h2>
        <p className="text-sm text-[#5b6775]">Download item ID from the Downloads module (e.g. strategic-plan).</p>
        <Input value={chartDownloadId} onChange={(e) => setChartDownloadId(e.target.value)} />
        <Button type="button" onClick={saveSettings} disabled={saving}>Save settings</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={startLeadership}><Plus className="h-4 w-4" /> Leadership row</Button>
        <Button type="button" variant="ghost" onClick={startYard}><Plus className="h-4 w-4" /> Yard row</Button>
      </div>

      {editing && (
        <div className="ksl-card space-y-4 p-6">
          <h2 className="text-[15px] font-bold text-[#0b1f3a]">
            {editing.scope === "yard" ? "Yard" : "Leadership"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {editing.scope === "yard" ? (
              <>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-[#5b6775]">Yard name</label>
                  <Input value={(editing as EditYard).name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-[#5b6775]">Lead division</label>
                  <Input value={(editing as EditYard).lead ?? ""} onChange={(e) => setEditing({ ...editing, lead: e.target.value })} />
                </div>
              </>
            ) : (
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-[#5b6775]">Role title</label>
                <Input value={(editing as EditLeadership).role ?? ""} onChange={(e) => setEditing({ ...editing, role: e.target.value })} />
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-[#5b6775]">Summary</label>
              <textarea
                className="min-h-[80px] w-full rounded border border-[#d7dde5] bg-white px-3 py-2 text-sm"
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
            <Button type="button" onClick={saveRow} disabled={saving}>Save</Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="ksl-card overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[13px]">
          <thead className="bg-[#f4f6f8] text-xs uppercase text-[#5b6775]">
            <tr><th className="px-4 py-3">Leadership</th><th className="px-4 py-3">Status</th><th /></tr>
          </thead>
          <tbody>
            {leadership.map((row) => (
              <tr key={row.id} className="border-t border-[#eef2f6]">
                <td className="px-4 py-3 font-medium text-[#0b1f3a]">{row.role}</td>
                <td className="px-4 py-3 capitalize text-[#5b6775]">{row.status}</td>
                <td className="px-4 py-3 text-right">
                  <button type="button" className="text-[#0b1f3a] hover:underline" onClick={() => setEditing({ ...row, scope: "leadership" })}>Edit</button>
                  <button type="button" className="ml-3 text-red-600" onClick={() => remove(row.id, "leadership")} aria-label="Delete"><Trash2 className="inline h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ksl-card overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[13px]">
          <thead className="bg-[#f4f6f8] text-xs uppercase text-[#5b6775]">
            <tr><th className="px-4 py-3">Yard</th><th className="px-4 py-3">Status</th><th /></tr>
          </thead>
          <tbody>
            {yards.map((row) => (
              <tr key={row.id} className="border-t border-[#eef2f6]">
                <td className="px-4 py-3 font-medium text-[#0b1f3a]">{row.name}</td>
                <td className="px-4 py-3 capitalize text-[#5b6775]">{row.status}</td>
                <td className="px-4 py-3 text-right">
                  <button type="button" className="text-[#0b1f3a] hover:underline" onClick={() => setEditing({ ...row, scope: "yard" })}>Edit</button>
                  <button type="button" className="ml-3 text-red-600" onClick={() => remove(row.id, "yard")} aria-label="Delete"><Trash2 className="inline h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
