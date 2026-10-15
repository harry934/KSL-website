"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageField } from "@/components/ui/image-field";
import { FileField } from "@/components/ui/file-field";
import { ItemList } from "@/components/ui/item-list";
import { RowList } from "@/components/ui/row-list";
import {
  AdvancedSlug,
  ChoiceField,
  Field,
  FieldGrid,
  FormSection,
  SaveBar,
  Textarea,
  VisibilitySwitch,
} from "@/components/ui/form-bits";
import { useFeedback } from "@/components/ui/feedback";
import { slugify } from "@/lib/news";
import { moveItem, uniqueSlug } from "@/lib/list-utils";
import { sendJson } from "@/lib/upload-client";
import type { ProductRow, ProductsSettings, Spec } from "@/lib/products";

type GroupDraft = { title: string; itemsText: string };

const EMPTY_SETTINGS: ProductsSettings = {
  kicker: "",
  title: "",
  intro: "",
  catalogue_url: "",
  range_kicker: "",
  range_title: "",
  range_groups: [],
};

function SpecRows({ specs, onChange, addLabel }: { specs: Spec[]; onChange: (specs: Spec[]) => void; addLabel: string }) {
  return (
    <RowList
      items={specs}
      onChange={onChange}
      newItem={() => ({ label: "", value: "" })}
      addLabel={addLabel}
      emptyText="None added yet."
      renderRow={(spec, update) => (
        <FieldGrid>
          <Input value={spec.label} onChange={(e) => update({ label: e.target.value })} placeholder="e.g. Length" aria-label="Name" />
          <Input value={spec.value} onChange={(e) => update({ value: e.target.value })} placeholder="e.g. 7.05 m" aria-label="Value" />
        </FieldGrid>
      )}
    />
  );
}

export function ProductsEditor({ canPublish, canDelete }: { canPublish: boolean; canDelete: boolean }) {
  const { toast, confirm } = useFeedback();
  const [items, setItems] = useState<ProductRow[]>([]);
  const [settings, setSettings] = useState<ProductsSettings>(EMPTY_SETTINGS);
  const [groups, setGroups] = useState<GroupDraft[]>([]);
  const [editing, setEditing] = useState<Partial<ProductRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/products");
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setItems(data.items ?? []);
      if (data.settings) {
        setSettings({ ...EMPTY_SETTINGS, ...data.settings });
        setGroups(
          ((data.settings.range_groups ?? []) as ProductsSettings["range_groups"]).map((g) => ({
            title: g.title,
            itemsText: g.items.join("\n"),
          }))
        );
      }
    } else {
      toast(data.error ?? "Could not load the products.", "error");
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const types = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) map.set(item.category_label || item.category, item.category);
    return map;
  }, [items]);

  async function saveSettings() {
    setSaving("settings");
    try {
      await sendJson("/api/products", "POST", {
        scope: "settings",
        ...settings,
        range_groups: groups
          .filter((g) => g.title.trim())
          .map((g) => ({
            title: g.title.trim(),
            items: g.itemsText
              .split(/\r?\n/)
              .map((s) => s.trim())
              .filter(Boolean),
          })),
      });
      toast("Page text saved.");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(null);
    }
  }

  function startNew() {
    const [firstLabel, firstKey] = types.entries().next().value ?? ["", ""];
    setEditing({
      name: "",
      slug: "",
      category: firstKey,
      category_label: firstLabel,
      eyebrow: "",
      image_path: "",
      image_alt: "",
      key_specs: [],
      extra_specs: [],
      sort_order: items.length ? Math.max(...items.map((i) => i.sort_order)) + 1 : 0,
      status: canPublish ? "published" : "draft",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveItem(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (!editing.name?.trim()) {
      toast("Give the product a name.", "error");
      return;
    }
    if (!editing.category_label?.trim()) {
      toast("Choose the type of boat.", "error");
      return;
    }
    setSaving("item");
    try {
      const slug =
        editing.slug?.trim() ||
        uniqueSlug(editing.name, items.filter((i) => i.id !== editing.id).map((i) => i.slug), "product");
      const clean = (specs: Spec[] | undefined) => (specs ?? []).filter((s) => s.label.trim() || s.value.trim());
      await sendJson("/api/products", "POST", {
        ...editing,
        slug,
        key_specs: clean(editing.key_specs),
        extra_specs: clean(editing.extra_specs),
      });
      toast(editing.status === "published" ? "Product saved and shown on the website." : "Product saved as hidden (draft).");
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
      await Promise.all(next.filter((i) => before.get(i.id) !== i.sort_order).map((i) => sendJson("/api/products", "POST", i)));
    } catch (err) {
      toast((err as Error).message, "error");
      load();
    }
  }

  async function remove(id: string) {
    const item = items.find((i) => i.id === id);
    const ok = await confirm({
      title: "Delete this product?",
      message: item ? `"${item.name}" will be removed from the website for good.` : undefined,
      confirmLabel: "Delete product",
      danger: true,
    });
    if (!ok) return;
    try {
      await sendJson(`/api/products?id=${encodeURIComponent(id)}`, "DELETE");
      toast("Product deleted.");
      load();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[14px] text-[#5b6775]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading products…
      </div>
    );
  }

  if (editing) {
    const set = (patch: Partial<ProductRow>) => setEditing({ ...editing, ...patch });
    return (
      <form onSubmit={saveItem} className="space-y-4">
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            <FormSection title={editing.id ? `Edit ${editing.name}` : "New product"}>
              <Field label="Product name">
                <Input value={editing.name ?? ""} onChange={(e) => set({ name: e.target.value })} autoFocus={!editing.id} />
              </Field>
              <FieldGrid>
                <Field label="Type of boat" hint="Visitors can filter the products by type.">
                  <ChoiceField
                    value={editing.category_label ?? ""}
                    options={Array.from(types.keys()).map((label) => ({ value: label, label }))}
                    onChange={(label) => set({ category_label: label, category: types.get(label) ?? slugify(label) })}
                    newLabel="Add a new type…"
                  />
                </Field>
                <Field label="Short label" optional hint="Small text above the name, e.g. Ambulance vessel.">
                  <Input value={editing.eyebrow ?? ""} onChange={(e) => set({ eyebrow: e.target.value })} />
                </Field>
              </FieldGrid>
            </FormSection>
            <FormSection title="Main specifications" description="Shown on the product card, e.g. Length – 7.05 m.">
              <SpecRows specs={editing.key_specs ?? []} onChange={(key_specs) => set({ key_specs })} addLabel="Add specification" />
            </FormSection>
            <FormSection title="More specifications" description="Shown when a visitor opens the product details.">
              <SpecRows specs={editing.extra_specs ?? []} onChange={(extra_specs) => set({ extra_specs })} addLabel="Add specification" />
            </FormSection>
          </div>
          <div className="space-y-4">
            <FormSection title="Visibility">
              <VisibilitySwitch status={editing.status ?? "draft"} canPublish={canPublish} onChange={(status) => set({ status })} />
            </FormSection>
            <FormSection title="Photo">
              <ImageField module="products" value={editing.image_path ?? ""} onChange={(image_path) => set({ image_path })} />
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
            {saving === "item" ? "Saving…" : "Save product"}
          </Button>
        </SaveBar>
      </form>
    );
  }

  const setS = (patch: Partial<ProductsSettings>) => setSettings({ ...settings, ...patch });

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[15px] font-bold text-[#0b1f3a]">Products</h2>
          <Button onClick={startNew}>
            <Plus className="h-4 w-4" /> New product
          </Button>
        </div>
        <ItemList
          showImages
          items={items.map((i) => ({
            id: i.id,
            title: i.name,
            subtitle: [i.category_label || i.category, i.eyebrow].filter(Boolean).join(" · "),
            image: i.image_path,
            status: i.status,
          }))}
          onEdit={(id) => setEditing(items.find((i) => i.id === id) ?? null)}
          onDelete={canDelete ? remove : undefined}
          onMove={move}
          emptyText="No products yet. Click New product to add one."
        />
      </div>

      <FormSection title="Page text" description="The words at the top of the Products page.">
        <FieldGrid>
          <Field label="Small text above the heading" optional>
            <Input value={settings.kicker ?? ""} onChange={(e) => setS({ kicker: e.target.value })} />
          </Field>
          <Field label="Heading">
            <Input value={settings.title ?? ""} onChange={(e) => setS({ title: e.target.value })} />
          </Field>
        </FieldGrid>
        <Field label="Introduction">
          <Textarea value={settings.intro ?? ""} onChange={(e) => setS({ intro: e.target.value })} />
        </Field>
        <Field label="Product catalogue" hint="The file visitors get when they click Download catalogue.">
          <FileField module="products" value={settings.catalogue_url ?? ""} onChange={(catalogue_url) => setS({ catalogue_url })} />
        </Field>
      </FormSection>

      <FormSection title="Other boats we build" description="The list of boat types further down the Products page.">
        <FieldGrid>
          <Field label="Small text above the heading" optional>
            <Input value={settings.range_kicker ?? ""} onChange={(e) => setS({ range_kicker: e.target.value })} />
          </Field>
          <Field label="Heading">
            <Input value={settings.range_title ?? ""} onChange={(e) => setS({ range_title: e.target.value })} />
          </Field>
        </FieldGrid>
        <RowList
          items={groups}
          onChange={setGroups}
          newItem={() => ({ title: "", itemsText: "" })}
          addLabel="Add group"
          emptyText="No groups yet."
          renderRow={(group, update) => (
            <div className="space-y-3">
              <Field label="Group name">
                <Input value={group.title} onChange={(e) => update({ title: e.target.value })} placeholder="e.g. Medical" />
              </Field>
              <Field label="Boats in this group" hint="Write one boat on each line.">
                <Textarea value={group.itemsText} onChange={(e) => update({ itemsText: e.target.value })} className="min-h-[80px]" />
              </Field>
            </div>
          )}
        />
      </FormSection>

      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving === "settings"}>
          {saving === "settings" ? "Saving…" : "Save page text"}
        </Button>
      </div>
    </div>
  );
}
