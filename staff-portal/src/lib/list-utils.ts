import { slugify } from "@/lib/news";

/** Move one item to a new index. Items between the two positions shift to make room. */
export function reorderItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Slug from the title that does not clash with any slug already in use. */
export function uniqueSlug(title: string, taken: Iterable<string>, fallback = "item") {
  const base = slugify(title) || fallback;
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
}

/** Short key for things like document or category IDs, derived from a label. */
export function keyFrom(label: string, taken: Iterable<string>) {
  return uniqueSlug(label, taken, "item");
}
