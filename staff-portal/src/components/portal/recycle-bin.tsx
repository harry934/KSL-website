"use client";

export function RecycleBin({
  items,
  onRestore,
}: {
  items: { id: string; title: string; deleted_at?: string | null }[];
  onRestore: (id: string) => void;
}) {
  if (!items.length) return null;
  return (
    <section className="ksl-card p-4">
      <h2 className="text-[15px] font-bold text-[#0b1f3a]">Removed recently</h2>
      <p className="mt-1 text-[13px] text-[#6b7785]">
        These can be restored for 14 days. After that they are deleted.
      </p>
      <ul className="mt-3 divide-y divide-[#eef1f4]">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 py-2">
            <span className="min-w-0 truncate text-[14px] text-[#0b1f3a]">{item.title}</span>
            <button
              type="button"
              className="shrink-0 text-[13px] font-semibold text-[#0b1f3a] underline"
              onClick={() => onRestore(item.id)}
            >
              Restore
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
