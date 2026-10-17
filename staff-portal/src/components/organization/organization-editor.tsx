"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FormSection, SaveBar, Select, Textarea, VisibilitySwitch } from "@/components/ui/form-bits";
import { ImageField } from "@/components/ui/image-field";
import { SearchSelect } from "@/components/ui/search-select";
import { ItemList } from "@/components/ui/item-list";
import { useFeedback } from "@/components/ui/feedback";
import { useCan } from "@/components/portal/session-context";
import { reorderItem } from "@/lib/list-utils";
import { sendJson } from "@/lib/upload-client";
import { documentOptions, useDocuments } from "@/lib/use-documents";
import type { BoardMemberRow, LeadershipRow } from "@/lib/organization";
import { WEBSITE_BOARD } from "@/lib/website-board";
import { siteAssetUrl } from "@/lib/site-url";

type Scope = "leadership" | "board";
type Draft = {
  scope: Scope;
  id?: string;
  role?: string;
  full_name?: string;
  board_group?: string;
  photo_url?: string | null;
  summary: string | null;
  sort_order: number;
  status: string;
};

const BOARD_GROUPS = [
  { value: "defence", label: "Defence" },
  { value: "ps", label: "Principal Secretaries" },
  { value: "independent", label: "Independent members" },
];

export function OrganizationEditor() {
  const { toast, confirm } = useFeedback();
  const canPublish = useCan("organization", "publish");
  const canDelete = useCan("organization", "delete");
  const documents = useDocuments();
  const [chartDownloadId, setChartDownloadId] = useState("");
  const [leadership, setLeadership] = useState<LeadershipRow[]>([]);
  const [board, setBoard] = useState<BoardMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/organization");
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setChartDownloadId(data.settings?.chart_download_id ?? "");
      setLeadership(data.leadership ?? []);
      setBoard(data.board ?? []);
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
    const list = scope === "board" ? board : leadership;
    setEditing({
      scope,
      role: "",
      full_name: "",
      board_group: "independent",
      photo_url: "",
      summary: "",
      sort_order: list.length ? Math.max(...list.map((r) => r.sort_order)) + 1 : 0,
      status: canPublish ? "published" : "draft",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveRow(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (editing.scope === "board") {
      if (!editing.full_name?.trim() || !editing.role?.trim()) {
        toast("Write the member's name and role.", "error");
        return;
      }
    } else if (!editing.role?.trim()) {
      toast("Write the role or office name.", "error");
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

  async function move(scope: Scope, from: number, to: number) {
    const list: (LeadershipRow | BoardMemberRow)[] = scope === "board" ? board : leadership;
    const next = reorderItem(list, from, to).map((row, i) => ({ ...row, sort_order: i }));
    const before = new Map(list.map((r) => [r.id, r.sort_order]));
    if (scope === "board") setBoard(next as BoardMemberRow[]);
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
      message: "It will be removed from the website for good.",
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
    const isBoard = editing.scope === "board";
    return (
      <form onSubmit={saveRow} className="space-y-4">
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <FormSection title={isBoard ? (editing.id ? "Edit board member" : "New board member") : editing.id ? "Edit leadership role" : "New leadership role"}>
            {isBoard ? (
              <>
                <Field label="Full name">
                  <Input value={editing.full_name ?? ""} onChange={(e) => set({ full_name: e.target.value })} autoFocus={!editing.id} />
                </Field>
                <Field label="Role">
                  <Input value={editing.role ?? ""} onChange={(e) => set({ role: e.target.value })} placeholder="e.g. Board member" />
                </Field>
                <Field label="Group">
                  <Select value={editing.board_group ?? "independent"} onChange={(e) => set({ board_group: e.target.value })}>
                    {BOARD_GROUPS.map((group) => (
                      <option key={group.value} value={group.value}>
                        {group.label}
                      </option>
                    ))}
                  </Select>
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
          <div className="space-y-4">
            {isBoard && (
              <FormSection title="Photo" description="Optional. A portrait shown on the KSL Board page.">
                <ImageField module="organization" value={editing.photo_url ?? ""} onChange={(photo_url) => set({ photo_url })} />
              </FormSection>
            )}
            <FormSection title="Visibility">
              <VisibilitySwitch status={editing.status} canPublish={canPublish} onChange={(status) => set({ status })} />
            </FormSection>
          </div>
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

  const groupLabel = (value: string) => BOARD_GROUPS.find((group) => group.value === value)?.label ?? value;

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
          onReorder={(from, to) => move("leadership", from, to)}
          emptyText="No leadership roles yet."
        />
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[15px] font-bold text-[#0b1f3a]">Board members</h2>
          <Button variant="secondary" onClick={() => start("board")}>
            <Plus className="h-4 w-4" /> New board member
          </Button>
        </div>
        <ul className="ksl-card mb-3 divide-y divide-[#eef1f4]">
          {WEBSITE_BOARD.map((member) => (
            <li key={member.photo} className="flex items-center gap-3 bg-white px-4 py-3">
              <span className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[6px] bg-[#f1f4f7]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={siteAssetUrl(member.photo)} alt="" className="h-full w-full object-cover" loading="lazy" />
              </span>
              <span className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-[#0b1f3a]">{member.name}</p>
                <p className="truncate text-[12.5px] text-[#6b7785]">
                  {member.role} · {member.group}
                </p>
              </span>
              <span className="shrink-0 rounded-full bg-[#e7f6ee] px-2.5 py-1 text-[12px] font-semibold text-[#067647]">On website</span>
            </li>
          ))}
        </ul>
        {board.length > 0 && (
          <ItemList
            showImages
            items={board.map((r) => ({
              id: r.id,
              title: r.full_name,
              subtitle: [r.role, groupLabel(r.board_group)].filter(Boolean).join(" · "),
              image: r.photo_url,
              status: r.status,
            }))}
            onEdit={(id) => {
              const row = board.find((r) => r.id === id);
              if (row) setEditing({ ...row, scope: "board" });
            }}
            onDelete={canDelete ? (id) => remove(id, "board") : undefined}
            onReorder={(from, to) => move("board", from, to)}
            emptyText="No extra board members yet."
          />
        )}
      </div>

      <FormSection title="Organisation chart document" description="The document visitors download from the Organisation page.">
        <Field label="Document">
          <SearchSelect
            value={chartDownloadId}
            options={documentOptions(documents, chartDownloadId)}
            onChange={setChartDownloadId}
            emptyLabel="No document"
            searchPlaceholder="Search documents"
          />
        </Field>
        <Button onClick={saveSettings} disabled={saving === "settings"}>
          {saving === "settings" ? "Saving…" : "Save"}
        </Button>
      </FormSection>
    </div>
  );
}
