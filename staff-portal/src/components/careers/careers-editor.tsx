"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGrid, FormSection, SaveBar, Textarea, VisibilitySwitch } from "@/components/ui/form-bits";
import { ItemList } from "@/components/ui/item-list";
import { useFeedback } from "@/components/ui/feedback";
import { useCan } from "@/components/portal/session-context";
import { reorderItem } from "@/lib/list-utils";
import { sendJson, awaitingReview, DRAFT_SAVED } from "@/lib/upload-client";
import type { CareerListingRow } from "@/lib/careers";
import { useOpenEdit } from "@/lib/open-edit";
import { appPath } from "@/lib/base-path";

type Settings = { apply_email: string; apply_note: string | null };
type Kind = CareerListingRow["kind"];

const KIND_WORDS: Record<Kind, { one: string; many: string }> = {
  vacancy: { one: "job", many: "Job openings" },
  internship: { one: "internship", many: "Internships" },
};

function formatDate(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value));
}

export function CareersEditor() {
  const { toast, confirm } = useFeedback();
  const canPublish = useCan("careers", "publish");
  const canDelete = useCan("careers", "delete");
  const [settings, setSettings] = useState<Settings>({ apply_email: "", apply_note: "" });
  const [listings, setListings] = useState<CareerListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<CareerListingRow> | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(appPath("/api/careers"));
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setSettings({ apply_email: data.settings?.apply_email ?? "", apply_note: data.settings?.apply_note ?? "" });
      setListings(data.listings ?? []);
    } else {
      toast(data.error ?? "Could not load careers.", "error");
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  useOpenEdit(loading, listings, (item) => setEditing(item));

  async function saveSettings() {
    setSaving("settings");
    try {
      await sendJson("/api/careers", "POST", { scope: "settings", ...settings });
      toast("How to apply saved.");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(null);
    }
  }

  function startNew(kind: Kind) {
    setEditing({
      kind,
      title: "",
      location: "",
      summary: "",
      closing_date: "",
      apply_url: "",
      sort_order: listings.length ? Math.max(...listings.map((l) => l.sort_order)) + 1 : 0,
      status: canPublish ? "published" : "draft",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveListing(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (!editing.title?.trim()) {
      toast("Give it a title.", "error");
      return;
    }
    setSaving("item");
    try {
      const saved = await sendJson("/api/careers", "POST", {
        ...editing,
        closing_date: editing.closing_date || null,
        apply_url: editing.apply_url?.trim() || null,
      });
      toast(awaitingReview(saved) ? DRAFT_SAVED : editing.status === "published" ? "Saved and shown on the website." : "Saved as hidden (draft).");
      setEditing(null);
      load();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(null);
    }
  }

  async function move(kind: Kind, from: number, to: number) {
    const group = listings.filter((l) => l.kind === kind);
    const updated = reorderItem(group, from, to).map((l, i) => ({ ...l, sort_order: i }));
    const before = new Map(listings.map((l) => [l.id, l.sort_order]));
    const byId = new Map(updated.map((l) => [l.id, l]));
    setListings((list) =>
      [...list.map((l) => byId.get(l.id) ?? l)].sort((a, b) => a.sort_order - b.sort_order)
    );
    try {
      await Promise.all(updated.filter((l) => before.get(l.id) !== l.sort_order).map((l) => sendJson("/api/careers", "POST", l)));
    } catch (err) {
      toast((err as Error).message, "error");
      load();
    }
  }

  async function remove(id: string) {
    const item = listings.find((l) => l.id === id);
    const ok = await confirm({
      title: "Delete this listing?",
      message: item ? `"${item.title}" moves to the recycle bin. Restore it or delete it for good from there.` : "It moves to the recycle bin. Restore it or delete it for good from there.",
      confirmLabel: "Move to bin",
      danger: true,
    });
    if (!ok) return;
    try {
      await sendJson(`/api/careers?id=${encodeURIComponent(id)}`, "DELETE");
      toast("Moved to the recycle bin.");
      load();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[14px] text-[#5b6775]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading careers…
      </div>
    );
  }

  if (editing) {
    const set = (patch: Partial<CareerListingRow>) => setEditing({ ...editing, ...patch });
    const word = KIND_WORDS[editing.kind ?? "vacancy"].one;
    return (
      <form onSubmit={saveListing} className="space-y-4">
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <FormSection title={editing.id ? `Edit ${word}` : `New ${word}`}>
            <Field label={editing.kind === "internship" ? "Internship title" : "Job title"}>
              <Input value={editing.title ?? ""} onChange={(e) => set({ title: e.target.value })} autoFocus={!editing.id} />
            </Field>
            <Field label="Place" optional>
              <Input value={editing.location ?? ""} onChange={(e) => set({ location: e.target.value })} placeholder="e.g. Mombasa" />
            </Field>
            <Field label="Description" hint="What the role involves and who should apply.">
              <Textarea className="min-h-[160px]" value={editing.summary ?? ""} onChange={(e) => set({ summary: e.target.value })} />
            </Field>
            {editing.kind === "vacancy" && (
              <FieldGrid>
                <Field label="Closing date" optional>
                  <Input type="date" value={editing.closing_date ?? ""} onChange={(e) => set({ closing_date: e.target.value })} />
                </Field>
                <Field label="Online application link" optional hint="Only if applications are made on another website.">
                  <Input value={editing.apply_url ?? ""} onChange={(e) => set({ apply_url: e.target.value })} placeholder="https://…" />
                </Field>
              </FieldGrid>
            )}
          </FormSection>
          <FormSection title="Visibility">
            <VisibilitySwitch status={editing.status ?? "draft"} canPublish={canPublish} onChange={(status) => set({ status })} />
          </FormSection>
        </div>
        <SaveBar>
          <Button variant="secondary" onClick={() => setEditing(null)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving === "item"}>
            {saving === "item" ? "Saving…" : `Save ${word}`}
          </Button>
        </SaveBar>
      </form>
    );
  }

  return (
    <div className="space-y-5">
      {(["vacancy", "internship"] as Kind[]).map((kind) => {
        const group = listings.filter((l) => l.kind === kind);
        return (
          <div key={kind}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[15px] font-bold text-[#0b1f3a]">{KIND_WORDS[kind].many}</h2>
              <Button variant={kind === "vacancy" ? "primary" : "secondary"} onClick={() => startNew(kind)}>
                <Plus className="h-4 w-4" /> New {KIND_WORDS[kind].one}
              </Button>
            </div>
            <ItemList
              items={group.map((l) => ({
                id: l.id,
                title: l.title,
                subtitle: [l.location, l.closing_date ? `Closes ${formatDate(l.closing_date)}` : ""].filter(Boolean).join(" · "),
                status: l.status,
              }))}
              onEdit={(id) => setEditing(listings.find((l) => l.id === id) ?? null)}
              onDelete={canDelete ? remove : undefined}
              onReorder={(from, to) => move(kind, from, to)}
              emptyText={kind === "vacancy" ? "No job openings right now." : "No internships right now."}
            />
          </div>
        );
      })}


      <FormSection title="How to apply" description="Shown on the Careers page under the listings.">
        <Field label="Email for applications">
          <Input type="email" value={settings.apply_email} onChange={(e) => setSettings({ ...settings, apply_email: e.target.value })} />
        </Field>
        <Field label="Instructions" optional>
          <Textarea value={settings.apply_note ?? ""} onChange={(e) => setSettings({ ...settings, apply_note: e.target.value })} />
        </Field>
        <Button onClick={saveSettings} disabled={saving === "settings"}>
          {saving === "settings" ? "Saving…" : "Save"}
        </Button>
      </FormSection>
    </div>
  );
}
