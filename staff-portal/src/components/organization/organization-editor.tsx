"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FormSection, SaveBar, Select, Textarea, VisibilitySwitch } from "@/components/ui/form-bits";
import { ItemList } from "@/components/ui/item-list";
import { useFeedback } from "@/components/ui/feedback";
import { useCan } from "@/components/portal/session-context";
import { moveItem } from "@/lib/list-utils";
import { sendJson } from "@/lib/upload-client";
import { useDocuments } from "@/lib/use-documents";
import type { LeadershipRow, YardRow } from "@/lib/organization";

type Scope = "leadership" | "yard";
type Draft = { scope: Scope; id?: string; role?: string; name?: string; lead?: string | null; summary: string | null; sort_order: number; status: string };

export function OrganizationEditor() {
  const { toast, confirm } = useFeedback();
  const canPublish = useCan("organization", "publish");
  const canDelete = useCan("organization", "delete");
  const documents = useDocuments();
  const [chartDownloadId, setChartDownloadId] = useState("");
  const [leadership, setLeadership] = useState<LeadershipRow[]>([]);
  const [yards, setYards] = useState<YardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/organization");
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setChartDownloadId(data.settings?.chart_download_id ?? "");
      setLeadership(data.leadership ?? []);
      setYards(data.yards ?? []);
    } else {
      toast(data.error ?? "Could not load the organisation page.", "error");
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveSettings() {
    setSaving("settings");
    try {
      await sendJson("/api/organization", "POST", { scope: "settings", chart_download_id: chartDownloadId || null });
      toast("Saved.");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(null);
    }
  }

  function start(scope: Scope) {
    const list = scope === "yard" ? yards : leadership;
    setEditing({
      scope,
      role: "",
      name: "",
      lead: "",
      summary: "",
      sort_order: list.length ? Math.max(...list.map((r) => r.sort_order)) + 1 : 0,
      status: canPublish ? "published" : "draft",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveRow(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const name = editing.scope === "yard" ? editing.name : editing.role;
    if (!name?.trim()) {
      toast(editing.scope === "yard" ? "Give the shipyard a name." : "Write the role or office name.", "error");
      return;
    }
    setSaving("row");
    try {
      await sendJson("/api/organization", "POST", editing);
      toast("Saved.");
      setEditing(null);
      load();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(null);
    }
  }

  async function move(scope: Scope, index: number, delta: number) {
    const list: (LeadershipRow | YardRow)[] = scope === "yard" ? yards : leadership;
    const next = moveItem(list, index, delta).map((row, i) => ({ ...row, sort_order: i }));
    const before = new Map(list.map((r) => [r.id, r.sort_order]));
    if (scope === "yard") setYards(next as YardRow[]);
    else setLeadership(next as LeadershipRow[]);
    try {
      await Promise.all(
        next.filter((r) => before.get(r.id) !== r.sort_order).map((r) => sendJson("/api/organization", "POST", { ...r, scope }))
      );
    } catch (err) {
      toast((err as Error).message, "error");
      load();
    }
  }

  async function remove(id: string, scope: Scope) {
    const ok = await confirm({
      title: "Delete this entry?",
      message: "It will be removed from the Organisation page for good.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await sendJson(`/api/organization?id=${encodeURIComponent(id)}&scope=${scope}`, "DELETE");
      toast("Deleted.");
      load();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[14px] text-[#5b6775]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading the organisation page…
      </div>
    );
  }

  if (editing) {
    const set = (patch: Partial<Draft>) => setEditing({ ...editing, ...patch });
    const isYard = editing.scope === "yard";
    return (
      <form onSubmit={saveRow} className="space-y-4">
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <FormSection title={isYard ? (editing.id ? "Edit shipyard" : "New shipyard") : editing.id ? "Edit leadership role" : "New leadership role"}>
            {isYard ? (
              <>
                <Field label="Shipyard name">
                  <Input value={editing.name ?? ""} onChange={(e) => set({ name: e.target.value })} autoFocus={!editing.id} />
                </Field>
                <Field label="Led by" optional hint="The division or office in charge.">
                  <Input value={editing.lead ?? ""} onChange={(e) => set({ lead: e.target.value })} />
                </Field>
              </>
            ) : (
              <Field label="Role or office">
                <Input value={editing.role ?? ""} onChange={(e) => set({ role: e.target.value })} autoFocus={!editing.id} placeholder="e.g. Managing Director" />
              </Field>
            )}
            <Field label="Description">
              <Textarea className="min-h-[120px]" value={editing.summary ?? ""} onChange={(e) => set({ summary: e.target.value })} />
            </Field>
          </FormSection>
          <FormSection title="Visibility">
            <VisibilitySwitch status={editing.status} canPublish={canPublish} onChange={(status) => set({ status })} />
          </FormSection>
        </div>
        <SaveBar>
          <Button variant="secondary" onClick={() => setEditing(null)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving === "row"}>
            {saving === "row" ? "Saving…" : "Save"}
          </Button>
        </SaveBar>
      </form>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[15px] font-bold text-[#0b1f3a]">Leadership</h2>
          <Button onClick={() => start("leadership")}>
            <Plus className="h-4 w-4" /> New role
          </Button>
        </div>
        <ItemList
          items={leadership.map((r) => ({ id: r.id, title: r.role, subtitle: r.summary, status: r.status }))}
          onEdit={(id) => {
            const row = leadership.find((r) => r.id === id);
            if (row) setEditing({ ...row, scope: "leadership" });
          }}
          onDelete={canDelete ? (id) => remove(id, "leadership") : undefined}
          onMove={(index, delta) => move("leadership", index, delta)}
          emptyText="No leadership roles yet."
        />
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[15px] font-bold text-[#0b1f3a]">Shipyards</h2>
          <Button variant="secondary" onClick={() => start("yard")}>
            <Plus className="h-4 w-4" /> New shipyard
          </Button>
        </div>
        <ItemList
          items={yards.map((r) => ({ id: r.id, title: r.name, subtitle: r.lead, status: r.status }))}
          onEdit={(id) => {
            const row = yards.find((r) => r.id === id);
            if (row) setEditing({ ...row, scope: "yard" });
          }}
          onDelete={canDelete ? (id) => remove(id, "yard") : undefined}
          onMove={(index, delta) => move("yard", index, delta)}
          emptyText="No shipyards yet."
        />
      </div>

      <FormSection title="Organisation chart document" description="The document visitors download from the Organisation page.">
        <Field label="Document">
          <Select value={chartDownloadId} onChange={(e) => setChartDownloadId(e.target.value)}>
            <option value="">No document</option>
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
            {chartDownloadId && !documents.some((d) => d.id === chartDownloadId) && (
              <option value={chartDownloadId}>Current document</option>
            )}
          </Select>
        </Field>
        <Button onClick={saveSettings} disabled={saving === "settings"}>
          {saving === "settings" ? "Saving…" : "Save"}
        </Button>
      </FormSection>
    </div>
  );
}
