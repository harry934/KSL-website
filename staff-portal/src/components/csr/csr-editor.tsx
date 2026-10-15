"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageField } from "@/components/ui/image-field";
import { ItemList } from "@/components/ui/item-list";
import { RowList } from "@/components/ui/row-list";
import { AdvancedSlug, Field, FieldGrid, FormSection, SaveBar, Textarea, VisibilitySwitch } from "@/components/ui/form-bits";
import { useFeedback } from "@/components/ui/feedback";
import { moveItem, uniqueSlug } from "@/lib/list-utils";
import { sendJson } from "@/lib/upload-client";
import type { CsrImage, CsrProjectRow, CsrSettings, CsrStat } from "@/lib/csr";

const EMPTY_SETTINGS: CsrSettings = {
  kicker: "",
  title: "",
  tagline: "",
  intro: "",
  badges: [],
  hero_images: [],
  stats: [],
  footnote: "",
  programmes_title: "",
  programmes_intro: "",
};

type Badge = { text: string };

export function CsrEditor({ canPublish, canDelete }: { canPublish: boolean; canDelete: boolean }) {
  const { toast, confirm } = useFeedback();
  const [settings, setSettings] = useState<CsrSettings>(EMPTY_SETTINGS);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [items, setItems] = useState<CsrProjectRow[]>([]);
  const [editing, setEditing] = useState<Partial<CsrProjectRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/csr");
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setItems(data.items ?? []);
      if (data.settings) {
        const s = { ...EMPTY_SETTINGS, ...data.settings } as CsrSettings;
        setSettings(s);
        setBadges((s.badges ?? []).map((text) => ({ text })));
      }
    } else {
      toast(data.error ?? "Could not load the CSR page.", "error");
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveSettings() {
    setSaving("settings");
    try {
      await sendJson("/api/csr", "POST", {
        scope: "settings",
        ...settings,
        badges: badges.map((b) => b.text.trim()).filter(Boolean),
        stats: settings.stats.filter((s) => s.value.trim() || s.label.trim()),
        hero_images: settings.hero_images.filter((i) => i.src.trim()),
      });
      toast("Page text saved.");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(null);
    }
  }

  function startNew() {
    setEditing({
      title: "",
      slug: "",
      summary: "",
      image_path: "",
      image_alt: "",
      location: "",
      event_date: "",
      sort_order: items.length ? Math.max(...items.map((i) => i.sort_order)) + 1 : 0,
      status: canPublish ? "published" : "draft",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveItem(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (!editing.title?.trim()) {
      toast("Give the programme a name.", "error");
      return;
    }
    setSaving("item");
    try {
      const slug =
        editing.slug?.trim() ||
        uniqueSlug(editing.title, items.filter((i) => i.id !== editing.id).map((i) => i.slug), "programme");
      await sendJson("/api/csr", "POST", { ...editing, slug, event_date: editing.event_date || null });
      toast(editing.status === "published" ? "Programme saved and shown on the website." : "Programme saved as hidden (draft).");
      setEditing(null);
      load();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(null);
    }
  }

  async function move(index: number, delta: number) {
    const next = moveItem(items, index, delta).map((item, i) => ({ ...item, sort_order: i }));
    const before = new Map(items.map((i) => [i.id, i.sort_order]));
    setItems(next);
    try {
      await Promise.all(next.filter((i) => before.get(i.id) !== i.sort_order).map((i) => sendJson("/api/csr", "POST", i)));
    } catch (err) {
      toast((err as Error).message, "error");
      load();
    }
  }

  async function remove(id: string) {
    const item = items.find((i) => i.id === id);
    const ok = await confirm({
      title: "Delete this programme?",
      message: item ? `"${item.title}" will be removed from the website for good.` : undefined,
      confirmLabel: "Delete programme",
      danger: true,
    });
    if (!ok) return;
    try {
      await sendJson(`/api/csr?id=${encodeURIComponent(id)}`, "DELETE");
      toast("Programme deleted.");
      load();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[14px] text-[#5b6775]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading the CSR page…
      </div>
    );
  }

  if (editing) {
    const set = (patch: Partial<CsrProjectRow>) => setEditing({ ...editing, ...patch });
    return (
      <form onSubmit={saveItem} className="space-y-4">
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <FormSection title={editing.id ? `Edit ${editing.title}` : "New programme"}>
            <Field label="Programme name">
              <Input value={editing.title ?? ""} onChange={(e) => set({ title: e.target.value })} autoFocus={!editing.id} />
            </Field>
            <Field label="What the programme is about">
              <Textarea className="min-h-[140px]" value={editing.summary ?? ""} onChange={(e) => set({ summary: e.target.value })} />
            </Field>
            <FieldGrid>
              <Field label="Place" optional>
                <Input value={editing.location ?? ""} onChange={(e) => set({ location: e.target.value })} />
              </Field>
              <Field label="Date" optional>
                <Input type="date" value={editing.event_date ?? ""} onChange={(e) => set({ event_date: e.target.value })} />
              </Field>
            </FieldGrid>
          </FormSection>
          <div className="space-y-4">
            <FormSection title="Visibility">
              <VisibilitySwitch status={editing.status ?? "draft"} canPublish={canPublish} onChange={(status) => set({ status })} />
            </FormSection>
            <FormSection title="Photo">
              <ImageField module="csr" value={editing.image_path ?? ""} onChange={(image_path) => set({ image_path })} />
              <Field label="Describe the photo" optional hint="Read aloud to visitors who cannot see the image.">
                <Input value={editing.image_alt ?? ""} onChange={(e) => set({ image_alt: e.target.value })} />
              </Field>
            </FormSection>
            <AdvancedSlug value={editing.slug ?? ""} onChange={(slug) => set({ slug })} />
          </div>
        </div>
        <SaveBar>
          <Button variant="secondary" onClick={() => setEditing(null)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving === "item"}>
            {saving === "item" ? "Saving…" : "Save programme"}
          </Button>
        </SaveBar>
      </form>
    );
  }

  const setS = (patch: Partial<CsrSettings>) => setSettings({ ...settings, ...patch });

  return (
    <div className="space-y-5">
      <FormSection title="Top of the page" description="The heading, introduction and photos at the top of the CSR page.">
        <FieldGrid>
          <Field label="Small text above the heading" optional>
            <Input value={settings.kicker ?? ""} onChange={(e) => setS({ kicker: e.target.value })} />
          </Field>
          <Field label="Heading">
            <Input value={settings.title ?? ""} onChange={(e) => setS({ title: e.target.value })} />
          </Field>
        </FieldGrid>
        <Field label="Tagline" optional>
          <Input value={settings.tagline ?? ""} onChange={(e) => setS({ tagline: e.target.value })} />
        </Field>
        <Field label="Introduction">
          <Textarea value={settings.intro ?? ""} onChange={(e) => setS({ intro: e.target.value })} />
        </Field>
        <Field label="Highlights" hint="Short labels shown as tags, e.g. Environment.">
          <RowList
            items={badges}
            onChange={setBadges}
            newItem={() => ({ text: "" })}
            addLabel="Add highlight"
            emptyText="No highlights yet."
            renderRow={(badge, update) => <Input value={badge.text} onChange={(e) => update({ text: e.target.value })} />}
          />
        </Field>
        <Field label="Photos" hint="Up to three photos shown at the top of the page.">
          <RowList<CsrImage>
            items={settings.hero_images}
            onChange={(hero_images) => setS({ hero_images })}
            newItem={() => ({ src: "", alt: "" })}
            addLabel="Add photo"
            emptyText="No photos yet."
            renderRow={(image, update) => (
              <div className="space-y-2">
                <ImageField module="csr" compact value={image.src} onChange={(src) => update({ src })} />
                <Input value={image.alt} onChange={(e) => update({ alt: e.target.value })} placeholder="Describe the photo" />
              </div>
            )}
          />
        </Field>
      </FormSection>

      <FormSection title="Our impact in numbers" description='Figures such as "10,000+ seedlings planted".'>
        <RowList<CsrStat>
          items={settings.stats}
          onChange={(stats) => setS({ stats })}
          newItem={() => ({ value: "", label: "" })}
          addLabel="Add figure"
          emptyText="No figures yet."
          renderRow={(stat, update) => (
            <div className="grid gap-2 sm:grid-cols-[160px_minmax(0,1fr)]">
              <Input value={stat.value} onChange={(e) => update({ value: e.target.value })} placeholder="e.g. 10,000+" aria-label="Number" />
              <Input
                value={stat.label}
                onChange={(e) => update({ label: e.target.value })}
                placeholder="e.g. Seedlings planted (5 years)"
                aria-label="What it counts"
              />
            </div>
          )}
        />
        <Field label="Note under the figures" optional>
          <Input value={settings.footnote ?? ""} onChange={(e) => setS({ footnote: e.target.value })} />
        </Field>
      </FormSection>

      <FormSection title="Programmes section" description="The heading and introduction above the list of programmes.">
        <FieldGrid>
          <Field label="Heading">
            <Input value={settings.programmes_title ?? ""} onChange={(e) => setS({ programmes_title: e.target.value })} />
          </Field>
          <Field label="Introduction" optional>
            <Input value={settings.programmes_intro ?? ""} onChange={(e) => setS({ programmes_intro: e.target.value })} />
          </Field>
        </FieldGrid>
      </FormSection>

      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving === "settings"}>
          {saving === "settings" ? "Saving…" : "Save page text"}
        </Button>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[15px] font-bold text-[#0b1f3a]">Programmes</h2>
          <Button onClick={startNew}>
            <Plus className="h-4 w-4" /> New programme
          </Button>
        </div>
        <ItemList
          showImages
          items={items.map((i) => ({ id: i.id, title: i.title, subtitle: i.location, image: i.image_path, status: i.status }))}
          onEdit={(id) => setEditing(items.find((i) => i.id === id) ?? null)}
          onDelete={canDelete ? remove : undefined}
          onMove={move}
          emptyText="No programmes yet. Click New programme to add one."
        />
      </div>
    </div>
  );
}
