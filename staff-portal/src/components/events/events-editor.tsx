"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGrid, FormSection, SaveBar, Textarea, VisibilitySwitch } from "@/components/ui/form-bits";
import { ImageField } from "@/components/ui/image-field";
import { ItemList } from "@/components/ui/item-list";
import { RichText } from "@/components/ui/rich-text";
import { useFeedback } from "@/components/ui/feedback";
import { useCan } from "@/components/portal/session-context";
import type { EventRow } from "@/lib/events";
import { useOpenEdit } from "@/lib/open-edit";
import { uniqueSlug } from "@/lib/list-utils";
import { sendJson, awaitingReview, DRAFT_SAVED } from "@/lib/upload-client";
import { EventsMonth } from "@/components/events/events-month";
import { nairobiToday } from "@/lib/dates";
import { appPath } from "@/lib/base-path";

function formatDate(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value));
}

export function EventsEditor() {
  const { toast, confirm } = useFeedback();
  const canPublish = useCan("events", "publish");
  const canDelete = useCan("events", "delete");
  const [items, setItems] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<EventRow> | null>(null);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"month" | "list">("month");

  const load = useCallback(async () => {
    const res = await fetch(appPath("/api/events"));
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setItems(data.items ?? []);
    }
    else toast(data.error ?? "Could not load the events.", "error");
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  useOpenEdit(loading, items, (item) => setEditing(item));

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
      image_alt: "",
      go_live_on: "",
      body_html: "",
      status: canPublish ? "published" : "draft",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (!editing.title?.trim()) {
      toast("Give the event a name.", "error");
      return;
    }
    if (!editing.event_date) {
      toast("Choose the date of the event.", "error");
      return;
    }
    setSaving(true);
    try {
      const slug =
        editing.slug?.trim() ||
        uniqueSlug(editing.title, items.filter((i) => i.id !== editing.id).map((i) => i.slug), "event");
      const saved = await sendJson("/api/events", "POST", { ...editing, slug, go_live_on: editing.go_live_on || null });
      const waiting = !awaitingReview(saved) && editing.status === "published" && editing.go_live_on && editing.go_live_on > nairobiToday();
      toast(
        awaitingReview(saved)
          ? DRAFT_SAVED
          : waiting
            ? "Saved. Visitors will see it on the morning you chose."
            : editing.status === "published"
              ? "Event saved and shown on the website."
              : "Event saved as hidden (draft)."
      );
      setEditing(null);
      load();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const item = items.find((i) => i.id === id);
    const ok = await confirm({
      title: "Remove this event?",
      message: item ? `"${item.title}" moves to the recycle bin. Restore it or delete it for good from there.` : "It moves to the recycle bin. Restore it or delete it for good from there.",
      confirmLabel: "Move to bin",
      danger: true,
    });
    if (!ok) return;
    try {
      await sendJson(`/api/events?id=${encodeURIComponent(id)}`, "DELETE");
      toast("Moved to the recycle bin.");
      load();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[14px] text-[#5b6775]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading events…
      </div>
    );
  }

  if (editing) {
    const set = (patch: Partial<EventRow>) => setEditing({ ...editing, ...patch });
    return (
      <form onSubmit={save} className="space-y-4">
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            <FormSection title={editing.id ? "Edit event" : "New event"}>
              <Field label="Event name">
                <Input value={editing.title ?? ""} onChange={(e) => set({ title: e.target.value })} autoFocus={!editing.id} />
              </Field>
              <Field label="Theme or tagline" optional>
                <Input value={editing.theme ?? ""} onChange={(e) => set({ theme: e.target.value })} />
              </Field>
              <Field label="Short description" hint="Shown on the events list before the event takes place.">
                <Textarea rows={2} className="min-h-[70px]" value={editing.description ?? ""} onChange={(e) => set({ description: e.target.value })} />
              </Field>
              <Field label="What happened" optional hint="A short recap shown once the event is over.">
                <Textarea rows={2} className="min-h-[70px]" value={editing.summary ?? ""} onChange={(e) => set({ summary: e.target.value })} />
              </Field>
              <Field label="Full details" optional>
                <RichText value={editing.body_html ?? ""} onChange={(html) => set({ body_html: html })} placeholder="Programme, speakers, how to attend…" />
              </Field>
            </FormSection>
          </div>
          <div className="space-y-4">
            <FormSection title="Visibility">
              <VisibilitySwitch status={editing.status ?? "draft"} canPublish={canPublish} onChange={(status) => set({ status })} />
            </FormSection>
            <FormSection title="When and where">
              <Field label="Date">
                <Input type="date" value={editing.event_date ?? ""} onChange={(e) => set({ event_date: e.target.value })} />
              </Field>
              <Field label="Show on the website from" hint="Leave this blank to show the event as soon as it is published.">
                <Input type="date" value={editing.go_live_on ?? ""} onChange={(e) => set({ go_live_on: e.target.value })} />
              </Field>
              <FieldGrid>
                <Field label="Starts" optional>
                  <Input type="time" value={editing.time_start ?? ""} onChange={(e) => set({ time_start: e.target.value })} />
                </Field>
                <Field label="Ends" optional>
                  <Input type="time" value={editing.time_end ?? ""} onChange={(e) => set({ time_end: e.target.value })} />
                </Field>
              </FieldGrid>
              <Field label="Venue" optional>
                <Input value={editing.venue ?? ""} onChange={(e) => set({ venue: e.target.value })} placeholder="e.g. KSL Mombasa Shipyard" />
              </Field>
            </FormSection>
            <FormSection title="Cover photo">
              <ImageField module="events" value={editing.image_path ?? ""} onChange={(image_path) => set({ image_path })} />
              {editing.image_path ? (
                <Field label="What the photo shows" hint="Required before an event with a photo can go on the website.">
                  <Input value={editing.image_alt ?? ""} onChange={(e) => set({ image_alt: e.target.value })} />
                </Field>
              ) : null}
            </FormSection>
          </div>
        </div>
        <SaveBar>
          <Button variant="secondary" onClick={() => setEditing(null)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save event"}
          </Button>
        </SaveBar>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex border border-[#d5dce4]">
          <button type="button" className={`px-3 py-1.5 text-[13px] font-semibold ${view === "month" ? "bg-[#0b1f3a] text-white" : "bg-white text-[#0b1f3a]"}`} onClick={() => setView("month")}>
            Month
          </button>
          <button type="button" className={`px-3 py-1.5 text-[13px] font-semibold ${view === "list" ? "bg-[#0b1f3a] text-white" : "bg-white text-[#0b1f3a]"}`} onClick={() => setView("list")}>
            List
          </button>
        </div>
        <Button onClick={startNew}>
          <Plus className="h-4 w-4" /> New event
        </Button>
      </div>
      {view === "month" && <EventsMonth items={items} onOpen={(item) => setEditing(item)} />}
      {view === "list" && <ItemList
        showImages
        items={items.map((i) => ({
          id: i.id,
          title: i.title,
          subtitle: [
            i.go_live_on && i.go_live_on > nairobiToday() ? `Appears ${formatDate(i.go_live_on)}` : formatDate(i.event_date),
            i.venue,
          ]
            .filter(Boolean)
            .join(" · "),
          image: i.image_path,
          status: i.status,
        }))}
        onEdit={(id) => setEditing(items.find((i) => i.id === id) ?? null)}
        onDelete={canDelete ? remove : undefined}
        emptyText="No events yet. Click New event to add one."
      />}
    </div>
  );
}
