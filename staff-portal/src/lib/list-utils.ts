import { slugify } from "@/lib/news";

export function moveItem<T>(list: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const next = list.slice();
  [next[index], next[target]] = [next[target], next[index]];
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
