"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  EmptyState,
  Field,
  FormSection,
  MoveButtons,
  SaveBar,
  Select,
  StatusBadge,
  Textarea,
  VisibilitySwitch,
} from "@/components/ui/form-bits";
import { ItemList } from "@/components/ui/item-list";
import { useFeedback } from "@/components/ui/feedback";
import { useCan } from "@/components/portal/session-context";
import { keyFrom, moveItem } from "@/lib/list-utils";
import { sendJson } from "@/lib/upload-client";

type FaqGroup = { id: string; title: string; sort_order: number; status: string };
type FaqItem = {
  id: string;
  group_id: string;
  question: string;
  answer: string;
  sort_order: number;
  status: string;
};

type Editing =
  | { kind: "group"; isNew: boolean; group: FaqGroup }
  | { kind: "item"; isNew: boolean; item: FaqItem }
  | null;

function nextOrder(list: { sort_order: number }[]) {
  return list.length ? Math.max(...list.map((x) => x.sort_order)) + 1 : 0;
}

function shorten(text: string, max = 110) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

export function FaqEditor() {
  const { toast, confirm } = useFeedback();
  const canPublish = useCan("faq", "publish");
  const canDelete = useCan("faq", "delete");
  const [groups, setGroups] = useState<FaqGroup[]>([]);
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Editing>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await sendJson("/api/faq", "GET");
      setGroups(data.groups ?? []);
      setItems(data.items ?? []);
    } catch (err) {
      toast((err as Error).message, "error");
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const defaultStatus = canPublish ? "published" : "draft";

  function newGroup() {
    setEditing({
      kind: "group",
      isNew: true,
      group: { id: "", title: "", sort_order: nextOrder(groups), status: defaultStatus },
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function newQuestion(groupId: string) {
    setEditing({
      kind: "item",
      isNew: true,
      item: {
        id: crypto.randomUUID(),
        group_id: groupId,
        question: "",
        answer: "",
        sort_order: nextOrder(items.filter((i) => i.group_id === groupId)),
        status: defaultStatus,
      },
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveEditing(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      if (editing.kind === "group") {
        const title = editing.group.title.trim();
        if (!title) {
          toast("Give the group a name.", "error");
          return;
        }
        const id = editing.isNew ? keyFrom(title, groups.map((g) => g.id)) : editing.group.id;
        await sendJson("/api/faq", "PUT", { type: "group", ...editing.group, id, title });
        toast(editing.group.status === "published" ? "Group saved and shown on the website." : "Group saved as hidden (draft).");
      } else {
        const { item } = editing;
        if (!item.question.trim() || !item.answer.trim()) {
          toast("Write both the question and the answer.", "error");
          return;
        }
        const original = items.find((i) => i.id === item.id);
        const movedGroup = original && original.group_id !== item.group_id;
        const sort_order = movedGroup ? nextOrder(items.filter((i) => i.group_id === item.group_id)) : item.sort_order;
        await sendJson("/api/faq", "PUT", {
          type: "item",
          ...item,
          question: item.question.trim(),
          answer: item.answer.trim(),
          sort_order,
        });
        toast(item.status === "published" ? "Question saved and shown on the website." : "Question saved as hidden (draft).");
      }
      setEditing(null);
      load();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function persistOrder(type: "group" | "item", before: Map<string, number>, updated: (FaqGroup | FaqItem)[]) {
    try {
      await Promise.all(
        updated
          .filter((row) => before.get(row.id) !== row.sort_order)
          .map((row) => sendJson("/api/faq", "PUT", { type, ...row }))
      );
    } catch (err) {
      toast((err as Error).message, "error");
      load();
    }
  }

  function moveGroup(index: number, delta: number) {
    const before = new Map(groups.map((g) => [g.id, g.sort_order]));
    const updated = moveItem(groups, index, delta).map((g, i) => ({ ...g, sort_order: i }));
    setGroups(updated);
    persistOrder("group", before, updated);
  }

  function moveQuestion(groupId: string, index: number, delta: number) {
    const inGroup = items.filter((i) => i.group_id === groupId);
    const before = new Map(inGroup.map((i) => [i.id, i.sort_order]));
    const updated = moveItem(inGroup, index, delta).map((i, n) => ({ ...i, sort_order: n }));
    const byId = new Map(updated.map((i) => [i.id, i]));
    setItems((list) => list.map((i) => byId.get(i.id) ?? i).sort((a, b) => a.sort_order - b.sort_order));
    persistOrder("item", before, updated);
  }

  async function removeGroup(group: FaqGroup) {
    const count = items.filter((i) => i.group_id === group.id).length;
    const ok = await confirm({
      title: "Delete this group?",
      message:
        count > 0
          ? `"${group.title}" and its ${count} question${count === 1 ? "" : "s"} will be removed from the website for good.`
          : `"${group.title}" will be removed for good.`,
      confirmLabel: "Delete group",
      danger: true,
    });
    if (!ok) return;
    try {
      await sendJson(`/api/faq?type=group&id=${encodeURIComponent(group.id)}`, "DELETE");
      toast("Group deleted.");
      load();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  async function removeQuestion(id: string) {
    const item = items.find((i) => i.id === id);
    const ok = await confirm({
      title: "Delete this question?",
      message: item ? `"${shorten(item.question, 80)}" will be removed from the website for good.` : undefined,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await sendJson(`/api/faq?type=item&id=${encodeURIComponent(id)}`, "DELETE");
      toast("Question deleted.");
      load();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[14px] text-[#5b6775]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading questions…
      </div>
    );
  }

  if (editing?.kind === "group") {
    const set = (patch: Partial<FaqGroup>) => setEditing({ ...editing, group: { ...editing.group, ...patch } });
    return (
      <form onSubmit={saveEditing} className="space-y-4">
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <FormSection
            title={editing.isNew ? "New group" : "Edit group"}
            description="Groups are the headings on the FAQ page, such as Services or Careers."
          >
            <Field label="Group name">
              <Input value={editing.group.title} onChange={(e) => set({ title: e.target.value })} autoFocus />
            </Field>
          </FormSection>
          <FormSection title="Visibility">
            <VisibilitySwitch status={editing.group.status} canPublish={canPublish} onChange={(status) => set({ status })} />
          </FormSection>
        </div>
        <SaveBar>
          <Button variant="secondary" onClick={() => setEditing(null)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save group"}
          </Button>
        </SaveBar>
      </form>
    );
  }

  if (editing?.kind === "item") {
    const set = (patch: Partial<FaqItem>) => setEditing({ ...editing, item: { ...editing.item, ...patch } });
    return (
      <form onSubmit={saveEditing} className="space-y-4">
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <FormSection title={editing.isNew ? "New question" : "Edit question"}>
            <Field label="Question">
              <Input
                value={editing.item.question}
                onChange={(e) => set({ question: e.target.value })}
                placeholder="e.g. How do I request a quotation?"
                autoFocus={editing.isNew}
              />
            </Field>
            <Field label="Answer" hint="Plain text. Press Enter to start a new line.">
              <Textarea
                className="min-h-[180px]"
                value={editing.item.answer}
                onChange={(e) => set({ answer: e.target.value })}
              />
            </Field>
          </FormSection>
          <div className="space-y-4">
            <FormSection title="Group">
              <Select value={editing.item.group_id} onChange={(e) => set({ group_id: e.target.value })}>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </Select>
            </FormSection>
            <FormSection title="Visibility">
              <VisibilitySwitch status={editing.item.status} canPublish={canPublish} onChange={(status) => set({ status })} />
            </FormSection>
          </div>
        </div>
        <SaveBar>
          <Button variant="secondary" onClick={() => setEditing(null)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save question"}
          </Button>
        </SaveBar>
      </form>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13.5px] text-[#5b6775]">
          Questions are grouped under headings. Use the arrows to change the order.
        </p>
        <Button onClick={newGroup}>
          <Plus className="h-4 w-4" /> Add group
        </Button>
      </div>

      {groups.length === 0 && <EmptyState>No questions yet. Click Add group to start.</EmptyState>}

      {groups.map((group, index) => {
        const questions = items.filter((i) => i.group_id === group.id);
        return (
          <FormSection
            key={group.id}
            title={group.title || "Untitled group"}
            description={`${questions.length} question${questions.length === 1 ? "" : "s"}`}
            actions={
              <>
                {group.status !== "published" && <StatusBadge status={group.status} />}
                <MoveButtons
                  onUp={() => moveGroup(index, -1)}
                  onDown={() => moveGroup(index, 1)}
                  first={index === 0}
                  last={index === groups.length - 1}
                />
                <Button variant="ghost" size="sm" onClick={() => setEditing({ kind: "group", isNew: false, group })}>
                  <Pencil className="h-3.5 w-3.5" /> Rename
                </Button>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => removeGroup(group)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-[#98a3b1] transition-colors hover:bg-[#fdecea] hover:text-[#b42318]"
                    aria-label="Delete group"
                    title="Delete group"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </>
            }
          >
            <ItemList
              items={questions.map((q) => ({
                id: q.id,
                title: q.question,
                subtitle: shorten(q.answer),
                status: q.status,
              }))}
              onEdit={(id) => {
                const item = items.find((i) => i.id === id);
                if (item) setEditing({ kind: "item", isNew: false, item });
              }}
              onDelete={canDelete ? removeQuestion : undefined}
              onMove={(i, delta) => moveQuestion(group.id, i, delta)}
              emptyText="No questions in this group yet."
            />
            <Button variant="secondary" size="sm" onClick={() => newQuestion(group.id)}>
              <Plus className="h-4 w-4" /> Add question
            </Button>
          </FormSection>
        );
      })}
    </div>
  );
}
