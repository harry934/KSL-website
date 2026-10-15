"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus } from "lucide-react";

type FaqGroup = { id: string; title: string; sort_order: number; status: string };
type FaqItem = {
  id: string;
  group_id: string;
  question: string;
  answer: string;
  sort_order: number;
  status: string;
};

export function FaqEditor() {
  const [groups, setGroups] = useState<FaqGroup[]>([]);
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/faq");
    const data = await res.json();
    if (res.ok) {
      setGroups(data.groups ?? []);
      setItems(data.items ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveGroup(group: FaqGroup) {
    setMessage(null);
    const res = await fetch("/api/faq", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "group", ...group }),
    });
    if (res.ok) {
      setMessage("Saved group");
      load();
    }
  }

  async function saveItem(item: FaqItem) {
    setMessage(null);
    const res = await fetch("/api/faq", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "item", ...item }),
    });
    if (res.ok) {
      setMessage("Saved question");
      load();
    }
  }

  function addGroup() {
    const id = "group-" + Date.now();
    setGroups((g) => [...g, { id, title: "New group", sort_order: g.length, status: "published" }]);
  }

  function addItem(groupId: string) {
    setItems((list) => [
      ...list,
      {
        id: crypto.randomUUID(),
        group_id: groupId,
        question: "",
        answer: "",
        sort_order: list.filter((i) => i.group_id === groupId).length,
        status: "published",
      },
    ]);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading FAQ…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && <p className="text-sm text-[#C4A35A]">{message}</p>}
      <Button type="button" onClick={addGroup}>
        <Plus className="h-4 w-4" /> Add group
      </Button>

      {groups.map((group) => (
        <section key={group.id} className="rounded-xl border border-white/10 bg-[#0d2847]/60 p-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1">
              <label className="mb-1 block text-xs text-slate-500">Group title</label>
              <Input
                value={group.title}
                onChange={(e) =>
                  setGroups((g) => g.map((x) => (x.id === group.id ? { ...x, title: e.target.value } : x)))
                }
              />
            </div>
            <Button type="button" onClick={() => saveGroup(group)}>Save group</Button>
            <Button type="button" variant="secondary" onClick={() => addItem(group.id)}>Add question</Button>
          </div>

          <div className="mt-4 space-y-4">
            {items
              .filter((i) => i.group_id === group.id)
              .map((item) => (
                <div key={item.id} className="rounded-lg border border-white/5 bg-[#071a33]/50 p-4 space-y-3">
                  <Input
                    placeholder="Question"
                    value={item.question}
                    onChange={(e) =>
                      setItems((list) =>
                        list.map((x) => (x.id === item.id ? { ...x, question: e.target.value } : x))
                      )
                    }
                  />
                  <textarea
                    className="w-full min-h-[80px] rounded-lg border border-white/10 bg-[#0f2d52] px-3 py-2 text-sm text-white"
                    placeholder="Answer"
                    value={item.answer}
                    onChange={(e) =>
                      setItems((list) =>
                        list.map((x) => (x.id === item.id ? { ...x, answer: e.target.value } : x))
                      )
                    }
                  />
                  <Button type="button" onClick={() => saveItem(item)}>Save</Button>
                </div>
              ))}
          </div>
        </section>
      ))}

      {groups.length === 0 && (
        <p className="text-sm text-slate-500">No FAQ groups yet. Import from site JSON or add a group.</p>
      )}
    </div>
  );
}
