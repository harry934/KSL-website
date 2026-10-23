"use client";

import { useFeedback } from "@/components/ui/feedback";

export function RecycleBin({
  items,
  onRestore,
  onDelete,
}: {
  items: { id: string; title: string; kind?: string }[];
  onRestore: (id: string, kind?: string) => void;
  onDelete: (id: string, kind?: string) => void;
}) {
  const { confirm } = useFeedback();
  if (!items.length) return null;

  async function remove(id: string, title: string, kind?: string) {
    const ok = await confirm({
      title: "Delete this for good?",
      message: `"${title}" will be removed from the database. This cannot be undone.`,
      confirmLabel: "Delete permanently",
      danger: true,
    });
    if (ok) onDelete(id, kind);
  }

  return (
    <section className="ksl-card p-4">
      <h2 className="text-[15px] font-bold text-[#0b1f3a]">Recycle bin</h2>
      <p className="mt-1 text-[13px] text-[#6b7785]">
        These have left the website. Restore one to put it back, or delete it here to remove it from the database.
      </p>
      <ul className="mt-3 divide-y divide-[#eef1f4]">
        {items.map((item) => (
          <li key={`${item.kind ?? "item"}:${item.id}`} className="flex items-center justify-between gap-3 py-2">
            <span className="min-w-0 truncate text-[14px] text-[#0b1f3a]">{item.title || "Untitled"}</span>
            <span className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                className="text-[13px] font-semibold text-[#0b1f3a] underline"
                onClick={() => onRestore(item.id, item.kind)}
              >
                Restore
              </button>
              <button
                type="button"
                className="text-[13px] font-semibold text-[#b42318] underline"
                onClick={() => remove(item.id, item.title || "Untitled", item.kind)}
              >
                Delete
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
