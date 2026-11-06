/** Keep a short, unique list of group names in the order an editor arranged them. */
export function cleanGroupOrder(value: unknown) {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const order: string[] = [];
  for (const entry of value) {
    const name = String(entry ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    order.push(name);
    if (order.length >= 40) break;
  }
  return order;
}

/** A newly saved group goes at the end until someone drags it. */
type Query = PromiseLike<{ data: { group_order?: unknown } | null }>;

type SettingsClient = {
  from: (table: "services_settings" | "projects_settings") => {
    select: (columns: string) => { eq: (column: string, value: string) => { maybeSingle: () => Query } };
    upsert: (row: { id: string; group_order: string[] }) => PromiseLike<unknown>;
  };
};

export async function rememberGroup(
  admin: unknown,
  table: "services_settings" | "projects_settings",
  name: string
) {
  const db = admin as SettingsClient;
  const label = name.replace(/\s+/g, " ").trim().slice(0, 80);
  if (!label) return;
  const { data } = await db.from(table).select("group_order").eq("id", "default").maybeSingle();
  const current = cleanGroupOrder(data?.group_order);
  if (current.includes(label)) return;
  await db.from(table).upsert({ id: "default", group_order: [...current, label] });
}
