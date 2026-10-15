"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageField } from "@/components/ui/image-field";
import { Field, Notice, Select, StatusBadge, Textarea } from "@/components/ui/form-bits";
import { slugify } from "@/lib/news";
import { specsToText, textToSpecs, type ProductRow, type ProductsSettings, type RangeGroup } from "@/lib/products";

type Draft = Partial<ProductRow> & { keySpecsText: string; extraSpecsText: string };

function groupsToText(groups: RangeGroup[]) {
  return groups.map((g) => `${g.title}: ${g.items.join("; ")}`).join("\n");
}

function textToGroups(text: string): RangeGroup[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf(":");
      const title = idx === -1 ? line : line.slice(0, idx).trim();
      const items = idx === -1 ? [] : line.slice(idx + 1).split(";").map((s) => s.trim()).filter(Boolean);
      return { title, items };
    });
}

export function ProductsEditor({ canPublish, canDelete }: { canPublish: boolean; canDelete: boolean }) {
  const [items, setItems] = useState<ProductRow[]>([]);
  const [settings, setSettings] = useState<ProductsSettings>({
    kicker: "",
    title: "",
    intro: "",
    catalogue_url: "",
    range_kicker: "",
    range_title: "",
    range_groups: [],
  });
  const [groupsText, setGroupsText] = useState("");
  const [editing, setEditing] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/products");
    const data = await res.json();
    if (res.ok) {
      setItems(data.items ?? []);
      if (data.settings) {
        setSettings(data.settings);
        setGroupsText(groupsToText(data.settings.range_groups ?? []));
      }
    } else {
      setError(data.error ?? "Failed to load products");
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
    const res = await fetch("/api/products", {
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
    if (await post({ scope: "settings", ...settings, range_groups: textToGroups(groupsText) })) {
      setMessage("Page text saved.");
    }
  }

  function startNew() {
    setEditing({
      name: "",
      slug: "",
      category: "",
      category_label: "",
      eyebrow: "",
      image_path: "",
      image_alt: "",
      keySpecsText: "",
      extraSpecsText: "",
      sort_order: items.length,
      status: "draft",
    });
  }

  async function saveItem() {
    if (!editing?.name) {
      setError("Name is required.");
      return;
    }
    const { keySpecsText, extraSpecsText, ...rest } = editing;
    const ok = await post({
      ...rest,
      slug: rest.slug || slugify(rest.name ?? ""),
      key_specs: textToSpecs(keySpecsText),
      extra_specs: textToSpecs(extraSpecsText),
    });
    if (ok) {
      setMessage(`Saved "${editing.name}".`);
      setEditing(null);
      load();
    }
  }

  async function remove(item: ProductRow) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    const res = await fetch("/api/products?id=" + encodeURIComponent(item.id), { method: "DELETE" });
    if (!res.ok) setError((await res.json().catch(() => ({}))).error ?? "Delete failed");
    load();
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[#5b6775]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading products…
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
          <Field label="Intro" className="sm:col-span-2">
            <Textarea value={settings.intro ?? ""} onChange={(e) => setSettings({ ...settings, intro: e.target.value })} />
          </Field>
          <Field label="Extended range kicker">
            <Input
              value={settings.range_kicker ?? ""}
              onChange={(e) => setSettings({ ...settings, range_kicker: e.target.value })}
            />
          </Field>
          <Field label="Extended range heading">
            <Input
              value={settings.range_title ?? ""}
              onChange={(e) => setSettings({ ...settings, range_title: e.target.value })}
            />
          </Field>
          <Field label="Product catalogue link" className="sm:col-span-2">
            <Input
              value={settings.catalogue_url ?? ""}
              onChange={(e) => setSettings({ ...settings, catalogue_url: e.target.value })}
              placeholder="docs/KSL-Brochure-version-28-NOV-2024.pdf"
            />
          </Field>
          <Field
            label="Extended range groups"
            hint='One group per line: "Medical: 13 m ambulance boat; 7.05 m ambulance boat"'
            className="sm:col-span-2"
          >
            <Textarea value={groupsText} onChange={(e) => setGroupsText(e.target.value)} className="min-h-[110px]" />
          </Field>
        </div>
        <Button type="button" onClick={saveSettings} disabled={saving}>
          Save page text
        </Button>
      </section>

      <div className="flex justify-end">
        <Button type="button" onClick={startNew}>
          <Plus className="h-4 w-4" /> New product
        </Button>
      </div>

      {editing && (
        <section className="ksl-card space-y-4 border-t-[3px] border-t-[#c5a028] p-[18px]">
          <h2 className="text-[15px] font-bold text-[#0b1f3a]">{editing.id ? `Edit ${editing.name}` : "New product"}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" className="sm:col-span-2">
              <Input
                value={editing.name ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value, slug: editing.id ? editing.slug : slugify(e.target.value) })
                }
              />
            </Field>
            <Field label="Slug">
              <Input value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />
            </Field>
            <Field label="Eyebrow" hint="Small label above the name, e.g. Ambulance vessel">
              <Input value={editing.eyebrow ?? ""} onChange={(e) => setEditing({ ...editing, eyebrow: e.target.value })} />
            </Field>
            <Field label="Filter key" hint="Groups products for the filter buttons, e.g. fishing">
              <Input
                value={editing.category ?? ""}
                onChange={(e) => setEditing({ ...editing, category: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
              />
            </Field>
            <Field label="Filter button label" hint="e.g. Fishing">
              <Input
                value={editing.category_label ?? ""}
                onChange={(e) => setEditing({ ...editing, category_label: e.target.value })}
              />
            </Field>
            <Field label="Image" className="sm:col-span-2">
              <ImageField
                module="products"
                value={editing.image_path ?? ""}
                onChange={(url) => setEditing({ ...editing, image_path: url })}
              />
            </Field>
            <Field label="Image description (alt text)" className="sm:col-span-2">
              <Input value={editing.image_alt ?? ""} onChange={(e) => setEditing({ ...editing, image_alt: e.target.value })} />
            </Field>
            <Field label="Key specs (on the card)" hint='One per line: "Length: 7.05 m"'>
              <Textarea
                value={editing.keySpecsText}
                onChange={(e) => setEditing({ ...editing, keySpecsText: e.target.value })}
              />
            </Field>
            <Field label="Additional specs (in details)" hint='One per line: "Crew: 5"'>
              <Textarea
                value={editing.extraSpecsText}
                onChange={(e) => setEditing({ ...editing, extraSpecsText: e.target.value })}
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
              {saving ? "Saving…" : "Save product"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </div>
        </section>
      )}

      <div className="ksl-card overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[13px]">
          <thead className="bg-[#f4f6f8] text-[11px] uppercase tracking-[0.06em] text-[#5b6775]">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Filter</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-[#5b6775]">
                  No products yet.
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.id} className="border-t border-[#eef2f6]">
                <td className="px-4 py-3">
                  <p className="font-semibold text-[#0b1f3a]">{item.name}</p>
                  <p className="text-[12px] text-[#5b6775]">{item.eyebrow}</p>
                </td>
                <td className="px-4 py-3 text-[#5b6775]">{item.category_label || item.category}</td>
                <td className="px-4 py-3 text-[#5b6775]">{item.sort_order}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={item.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <button
                    type="button"
                    className="font-semibold text-[#0b1f3a] hover:underline"
                    onClick={() =>
                      setEditing({
                        ...item,
                        keySpecsText: specsToText(item.key_specs),
                        extraSpecsText: specsToText(item.extra_specs),
                      })
                    }
                  >
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
