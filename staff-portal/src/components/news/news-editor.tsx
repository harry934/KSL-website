"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChoiceField,
  Field,
  FieldGrid,
  FormSection,
  SaveBar,
  Textarea,
  VisibilitySwitch,
} from "@/components/ui/form-bits";
import { ImageField } from "@/components/ui/image-field";
import { ItemList } from "@/components/ui/item-list";
import { RichText } from "@/components/ui/rich-text";
import { useFeedback } from "@/components/ui/feedback";
import { useCan } from "@/components/portal/session-context";
import type { NewsRow } from "@/lib/news";
import { nairobiToday } from "@/lib/dates";
import { newsPublicUrl } from "@/lib/public-links";
import { useOpenEdit } from "@/lib/open-edit";
import { uniqueSlug } from "@/lib/list-utils";
import { sendJson, awaitingReview, DRAFT_SAVED } from "@/lib/upload-client";
import { appPath } from "@/lib/base-path";

function formatDate(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value));
}

export function NewsEditor() {
  const { toast, confirm } = useFeedback();
  const canPublish = useCan("news", "publish");
  const canDelete = useCan("news", "delete");
  const [items, setItems] = useState<NewsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<NewsRow> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(appPath("/api/news"));
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setItems(data.items ?? []);
    }
    else toast(data.error ?? "Could not load the news.", "error");
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  useOpenEdit(loading, items, (item) => setEditing(item));

  const categories = useMemo(() => {
    const names = new Set(["News", ...items.map((i) => i.category).filter((c): c is string => !!c)]);
    return Array.from(names).map((name) => ({ value: name, label: name }));
  }, [items]);

  function startNew() {
    setEditing({
      title: "",
      slug: "",
      excerpt: "",
      category: "News",
      published_date: new Date().toISOString().slice(0, 10),
      image_path: "",
      author: "KSL Communications",
      location: "",
      body_html: "",
      go_live_on: "",
      image_alt: "",
      status: canPublish ? "published" : "draft",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (!editing.title?.trim()) {
      toast("Give the article a title.", "error");
      return;
    }
    setSaving(true);
    try {
      const slug =
        editing.slug?.trim() ||
        uniqueSlug(editing.title, items.filter((i) => i.id !== editing.id).map((i) => i.slug), "news");
      const saved = await sendJson("/api/news", "POST", { ...editing, slug, go_live_on: editing.go_live_on || null });
      const waiting = !awaitingReview(saved) && editing.status === "published" && editing.go_live_on && editing.go_live_on > nairobiToday();
      toast(
        awaitingReview(saved)
          ? DRAFT_SAVED
          : waiting
          ? "Saved. Visitors will see it on the morning you chose."
          : editing.status === "published"
            ? "Article saved and shown on the website."
            : "Article saved as hidden (draft)."
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
      title: "Remove this article?",
      message: item
        ? `"${item.title}" is permanently deleted from the database.`
        : "It is permanently deleted from the database.",
      confirmLabel: "Delete article",
      danger: true,
    });
    if (!ok) return;
    try {
      await sendJson(`/api/news?id=${encodeURIComponent(id)}`, "DELETE");
      toast("Article deleted.");
      load();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[14px] text-[#5b6775]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading news…
      </div>
    );
  }

  if (editing) {
    const set = (patch: Partial<NewsRow>) => setEditing({ ...editing, ...patch });
    return (
      <form onSubmit={save} className="space-y-4">
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            <FormSection title={editing.id ? "Edit article" : "New article"}>
              <Field label="Title">
                <Input value={editing.title ?? ""} onChange={(e) => set({ title: e.target.value })} autoFocus={!editing.id} />
              </Field>
              <Field label="Short summary" hint="One or two sentences shown on the news list.">
                <Textarea rows={2} className="min-h-[70px]" value={editing.excerpt ?? ""} onChange={(e) => set({ excerpt: e.target.value })} />
              </Field>
              <Field label="Full story">
                <RichText value={editing.body_html ?? ""} onChange={(html) => set({ body_html: html })} placeholder="Write the full story here…" />
              </Field>
            </FormSection>
          </div>
          <div className="space-y-4">
            <FormSection title="Visibility">
              <VisibilitySwitch status={editing.status ?? "draft"} canPublish={canPublish} onChange={(status) => set({ status })} />
            </FormSection>
            <FormSection title="Details">
              <Field label="Date">
                <Input type="date" value={editing.published_date ?? ""} onChange={(e) => set({ published_date: e.target.value })} />
              </Field>
              <Field label="Show on the website from" hint="Leave this blank to show the story as soon as it is published. A future date keeps it hidden until that morning.">
                <Input type="date" value={editing.go_live_on ?? ""} onChange={(e) => set({ go_live_on: e.target.value })} />
              </Field>
              <Field label="Category">
                <ChoiceField value={editing.category ?? ""} options={categories} onChange={(category) => set({ category })} />
              </Field>
              <FieldGrid className="sm:grid-cols-1">
                <Field label="Place" optional>
                  <Input value={editing.location ?? ""} onChange={(e) => set({ location: e.target.value })} placeholder="e.g. Mombasa" />
                </Field>
                <Field label="Written by" optional>
                  <Input value={editing.author ?? ""} onChange={(e) => set({ author: e.target.value })} />
                </Field>
              </FieldGrid>
            </FormSection>
            <FormSection title="Cover photo">
              <ImageField module="news" value={editing.image_path ?? ""} onChange={(image_path) => set({ image_path })} />
              {editing.image_path ? (
                <Field label="What the photo shows" hint="Required before a story with a photo can go on the website.">
                  <Input value={editing.image_alt ?? ""} onChange={(e) => set({ image_alt: e.target.value })} />
                </Field>
              ) : null}
            </FormSection>
          </div>
        </div>
        <SaveBar>
          {editing.status === "published" && editing.slug && (!editing.go_live_on || editing.go_live_on <= nairobiToday()) && (
            <a href={newsPublicUrl(editing.slug)} target="_blank" rel="noreferrer" className="mr-auto text-[13.5px] font-semibold text-[#0b1f3a] underline-offset-2 hover:underline">
              View on the website
            </a>
          )}
          <Button variant="secondary" onClick={() => setEditing(null)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save article"}
          </Button>
        </SaveBar>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={startNew}>
          <Plus className="h-4 w-4" /> New article
        </Button>
      </div>
      <ItemList
        showImages
        items={items.map((i) => ({
          id: i.id,
          title: i.title,
          subtitle: [
            i.go_live_on && i.go_live_on > nairobiToday() ? `Appears ${formatDate(i.go_live_on)}` : formatDate(i.published_date),
            i.category,
          ]
            .filter(Boolean)
            .join(" · "),
          image: i.image_path,
          status: i.status,
          siteHref:
            i.status === "published" && i.slug && (!i.go_live_on || i.go_live_on <= nairobiToday())
              ? newsPublicUrl(i.slug)
              : undefined,
        }))}
        onEdit={(id) => setEditing(items.find((i) => i.id === id) ?? null)}
        onDelete={canDelete ? remove : undefined}
        emptyText="No articles yet. Click New article to write the first one."
      />
    </div>
  );
}
