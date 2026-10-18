export type DownloadItemRow = {
  id: string;
  title: string;
  subtitle: string | null;
  category: string;
  category_label: string;
  language: string | null;
  doc_date: string | null;
  file_type: string | null;
  file_name: string | null;
  anchor: string | null;
  alias_of: string | null;
  external_href: string | null;
  source: "standard" | "storage" | null;
  sort_order: number;
  status: string;
};

export function downloadSource(row: Pick<DownloadItemRow, "source" | "external_href">): "standard" | "storage" {
  if (row.source === "storage" || row.source === "standard") return row.source;
  return row.external_href?.trim() ? "storage" : "standard";
}

export function toPublicDownloadItem(row: DownloadItemRow, baseUrl: string) {
  const file = row.file_name ?? "";
  const stored = row.external_href?.trim() || "";
  const href = downloadSource(row) === "storage" ? stored || undefined : file && baseUrl ? baseUrl + file : undefined;
  const item: Record<string, string | undefined> = {
    id: row.id,
    title: row.title,
    category: row.category,
    categoryLabel: row.category_label,
    language: row.language ?? undefined,
    date: row.doc_date ?? undefined,
    type: row.file_type ?? undefined,
    file: file || undefined,
    filename: file || undefined,
    anchor: row.anchor ?? undefined,
    href,
  };
  if (row.subtitle) item.subtitle = row.subtitle;
  if (row.alias_of) item.aliasOf = row.alias_of;
  return item;
}

export function toPublicDownloadsPayload(baseUrl: string | null, rows: DownloadItemRow[]) {
  const base = (baseUrl ?? "").replace(/\/?$/, "/");
  const items = rows
    .filter((r) => r.status === "published")
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((r) => toPublicDownloadItem(r, base));
  return { baseUrl: base, items };
}
