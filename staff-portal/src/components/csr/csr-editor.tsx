"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageField } from "@/components/ui/image-field";
import { Field, Notice, Select, StatusBadge, Textarea } from "@/components/ui/form-bits";
import { slugify } from "@/lib/news";
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

function statsToText(stats: CsrStat[]) {
  return stats.map((s) => `${s.value} | ${s.label}`).join("\n");
}

function textToStats(text: string): CsrStat[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [value, ...rest] = line.split("|");
      return { value: value.trim(), label: rest.join("|").trim() };
    });
}

function imagesToText(images: CsrImage[]) {
  return images.map((i) => `${i.src} | ${i.alt}`).join("\n");
}

function textToImages(text: string): CsrImage[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [src, ...rest] = line.split("|");
      return { src: src.trim(), alt: rest.join("|").trim() };
    });
}

export function CsrEditor({ canPublish, canDelete }: { canPublish: boolean; canDelete: boolean }) {
  const [settings, setSettings] = useState<CsrSettings>(EMPTY_SETTINGS);
  const [badgesText, setBadgesText] = useState("");
  const [statsText, setStatsText] = useState("");
  const [imagesText, setImagesText] = useState("");
  const [items, setItems] = useState<CsrProjectRow[]>([]);
  const [editing, setEditing] = useState<Partial<CsrProjectRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/csr");
    const data = await res.json();
    if (res.ok) {
      setItems(data.items ?? []);
      if (data.settings) {
        const s = { ...EMPTY_SETTINGS, ...data.settings } as CsrSettings;
        setSettings(s);
        setBadgesText((s.badges ?? []).join("\n"));
        setStatsText(statsToText(s.stats ?? []));
        setImagesText(imagesToText(s.hero_images ?? []));
      }
    } else {
      setError(data.error ?? "Failed to load CSR content");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function post(body: unknown) {
    setSaving(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/csr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Save failed");
      return false;
    }
    return true;
  }

  async function saveSettings() {
    const ok = await post({
      scope: "settings",
      ...settings,
      badges: badgesText.split(/\r?\n/).map((s) => s.trim()).filter(Boolean),
      stats: textToStats(statsText),
      hero_images: textToImages(imagesText),
    });
    if (ok) setMessage("Page text saved.");
  }

  async function saveItem() {
    if (!editing?.title) {
      setError("Title is required.");
      return;
    }
    if (await post({ ...editing, slug: editing.slug || slugify(editing.title) })) {
      setMessage(`Saved "${editing.title}".`);
      setEditing(null);
      load();
    }
  }

  async function remove(item: CsrProjectRow) {
    if (!confirm(`Delete "${item.title}"?`)) return;
    const res = await fetch("/api/csr?id=" + encodeURIComponent(item.id), { method: "DELETE" });
    if (!res.ok) setError((await res.json().catch(() => ({}))).error ?? "Delete failed");
    load();
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[#5b6775]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading CSR…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[14px]">
      {error && <Notice kind="error">{error}</Notice>}
      {message && <Notice kind="success">{message}</Notice>}

      <section className="ksl-card space-y-4 p-[18px]">
        <h2 className="text-[15px] font-bold text-[#0b1f3a]">Page text</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kicker">
            <Input value={settings.kicker ?? ""} onChange={(e) => setSettings({ ...settings, kicker: e.target.value })} />
          </Field>
          <Field label="Heading">
            <Input value={settings.title ?? ""} onChange={(e) => setSettings({ ...settings, title: e.target.value })} />
          </Field>
          <Field label="Tagline" className="sm:col-span-2">
            <Input value={settings.tagline ?? ""} onChange={(e) => setSettings({ ...settings, tagline: e.target.value })} />
          </Field>
          <Field label="Intro" className="sm:col-span-2">
            <Textarea value={settings.intro ?? ""} onChange={(e) => setSettings({ ...settings, intro: e.target.value })} />
          </Field>
          <Field label="Badges" hint="One per line">
            <Textarea value={badgesText} onChange={(e) => setBadgesText(e.target.value)} />
          </Field>
          <Field label="Impact figures" hint='One per line: "10,000+ | Seedlings planted (5 years)"'>
            <Textarea value={statsText} onChange={(e) => setStatsText(e.target.value)} />
          </Field>
          <Field label="Hero images" hint='Up to 3, one per line: "img/ksl/gallery/photo.jpg | Description"' className="sm:col-span-2">
            <Textarea value={imagesText} onChange={(e) => setImagesText(e.target.value)} />
          </Field>
          <Field label="Footnote" className="sm:col-span-2">
            <Input value={settings.footnote ?? ""} onChange={(e) => setSettings({ ...settings, footnote: e.target.value })} />
          </Field>
          <Field label="Programmes heading">
            <Input
              value={settings.programmes_title ?? ""}
              onChange={(e) => setSettings({ ...settings, programmes_title: e.target.value })}
            />
          </Field>
          <Field label="Programmes intro">
            <Input
              value={settings.programmes_intro ?? ""}
              onChange={(e) => setSettings({ ...settings, programmes_intro: e.target.value })}
            />
          </Field>
        </div>
        <Button type="button" onClick={saveSettings} disabled={saving}>
          Save page text
        </Button>
      </section>

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={() => setEditing({ title: "", slug: "", summary: "", image_path: "", sort_order: items.length, status: "draft" })}
        >
          <Plus className="h-4 w-4" /> New programme
        </Button>
      </div>

      {editing && (
        <section className="ksl-card space-y-4 border-t-[3px] border-t-[#c5a028] p-[18px]">
          <h2 className="text-[15px] font-bold text-[#0b1f3a]">{editing.id ? `Edit ${editing.title}` : "New programme"}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" className="sm:col-span-2">
              <Input
                value={editing.title ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, title: e.target.value, slug: editing.id ? editing.slug : slugify(e.target.value) })
                }
              />
            </Field>
            <Field label="Summary" className="sm:col-span-2">
              <Textarea value={editing.summary ?? ""} onChange={(e) => setEditing({ ...editing, summary: e.target.value })} />
            </Field>
            <Field label="Image" className="sm:col-span-2">
              <ImageField module="csr" value={editing.image_path ?? ""} onChange={(url) => setEditing({ ...editing, image_path: url })} />
            </Field>
            <Field label="Image description (alt text)" className="sm:col-span-2">
              <Input value={editing.image_alt ?? ""} onChange={(e) => setEditing({ ...editing, image_alt: e.target.value })} />
            </Field>
            <Field label="Location (optional)">
              <Input value={editing.location ?? ""} onChange={(e) => setEditing({ ...editing, location: e.target.value })} />
            </Field>
            <Field label="Date (optional)">
              <Input
                type="date"
                value={editing.event_date ?? ""}
                onChange={(e) => setEditing({ ...editing, event_date: e.target.value })}
              />
            </Field>
            <Field label="Sort order">
              <Input
                type="number"
                value={editing.sort_order ?? 0}
                onChange={(e) => setEditing({ ...editing, sort_order: parseInt(e.target.value, 10) || 0 })}
              />
            </Field>
            <Field label="Status" hint={canPublish ? undefined : "You can save drafts. A publisher makes them live."}>
              <Select value={editing.status ?? "draft"} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                <option value="draft">Draft</option>
                {canPublish && <option value="published">Published</option>}
                <option value="archived">Archived</option>
              </Select>
            </Field>
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={saveItem} disabled={saving}>
              {saving ? "Saving…" : "Save programme"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </div>
        </section>
      )}

      <div className="ksl-card overflow-x-auto">
        <table className="w-full min-w-[600px] text-left text-[13px]">
          <thead className="bg-[#f4f6f8] text-[11px] uppercase tracking-[0.06em] text-[#5b6775]">
            <tr>
              <th className="px-4 py-3">Programme</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-[#5b6775]">
                  No programmes yet.
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.id} className="border-t border-[#eef2f6]">
                <td className="px-4 py-3">
                  <p className="font-semibold text-[#0b1f3a]">{item.title}</p>
                  <p className="line-clamp-1 text-[12px] text-[#5b6775]">{item.summary}</p>
                </td>
                <td className="px-4 py-3 text-[#5b6775]">{item.sort_order}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={item.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <button type="button" className="font-semibold text-[#0b1f3a] hover:underline" onClick={() => setEditing(item)}>
                    Edit
                  </button>
                  {canDelete && (
                    <button type="button" className="ml-3 text-[#b42318]" onClick={() => remove(item)} aria-label="Delete">
                      <Trash2 className="inline h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
