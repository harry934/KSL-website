import { keyFrom } from "@/lib/list-utils";
import { slugify } from "@/lib/news";
import { safeLink } from "@/lib/safe-link";

export type ServiceRow = {
  id: string;
  slug: string;
  category: string | null;
  title: string;
  excerpt: string | null;
  detail: string | null;
  image_path: string | null;
  downloads: string[] | null;
  actions?: ServiceModalActions | null;
  source_popup_id: string | null;
  sort_order: number;
  status: string;
};

export type ServiceModalAction = {
  label: string;
  href: string;
};

export type ServiceModalActions = {
  primary: ServiceModalAction;
  secondary: ServiceModalAction;
  tertiary: ServiceModalAction;
};

export type ServicesSettings = {
  intro: string | null;
  download_catalog: Record<string, { title: string; href: string }>;
  group_order?: string[] | null;
  modal_actions?: ServiceModalActions | null;
};

export { slugify };

export const SERVICE_GROUPS = [
  "Maintenance, Repair and Overhaul",
  "Civil and Modular Works",
  "Heavy Engineering",
  "Leasing",
  "Production and Design",
] as const;

export const DEFAULT_SERVICE_MODAL_ACTIONS: ServiceModalActions = {
  primary: { label: "Request a quote", href: "contact.html" },
  secondary: { label: "View projects", href: "project.html" },
  tertiary: { label: "All corporate documents", href: "downloads.html" },
};

/** Empty label means the button is hidden. */
export function cleanOptionalAction(value: unknown): ServiceModalAction {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const label = String(row.label ?? "").trim().slice(0, 60);
  if (!label) return { label: "", href: "" };
  return { label, href: safeLink(row.href) || "contact.html" };
}

export function cleanModalActions(value: unknown, fillDefaults = false): ServiceModalActions {
  if (fillDefaults && (value == null || value === undefined)) {
    return {
      primary: { ...DEFAULT_SERVICE_MODAL_ACTIONS.primary },
      secondary: { ...DEFAULT_SERVICE_MODAL_ACTIONS.secondary },
      tertiary: { ...DEFAULT_SERVICE_MODAL_ACTIONS.tertiary },
    };
  }
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  if (fillDefaults) {
    return {
      primary: "primary" in row ? cleanOptionalAction(row.primary) : { ...DEFAULT_SERVICE_MODAL_ACTIONS.primary },
      secondary: "secondary" in row ? cleanOptionalAction(row.secondary) : { ...DEFAULT_SERVICE_MODAL_ACTIONS.secondary },
      tertiary: "tertiary" in row ? cleanOptionalAction(row.tertiary) : { ...DEFAULT_SERVICE_MODAL_ACTIONS.tertiary },
    };
  }
  return {
    primary: cleanOptionalAction(row.primary),
    secondary: cleanOptionalAction(row.secondary),
    tertiary: cleanOptionalAction(row.tertiary),
  };
}

export function resolveServiceActions(
  itemActions: unknown,
  settingsActions: unknown
): ServiceModalActions {
  if (itemActions != null) return cleanModalActions(itemActions, false);
  return cleanModalActions(settingsActions, true);
}

const POPUP_SLOTS = ["primary", "secondary", "tertiary"] as const;

/** Buttons that actually appear, in popup order. A blank label is hidden. */
export function popupButtonsFromActions(actions: ServiceModalActions): ServiceModalAction[] {
  return POPUP_SLOTS.map((slot) => actions[slot]).filter((button) => button.label.trim());
}

/** First button is the main button, second is the outline button, third is the text link. */
export function actionsFromPopupButtons(buttons: ServiceModalAction[]): ServiceModalActions {
  const blank = { label: "", href: "" };
  const kept = buttons
    .filter((button) => button.label.trim())
    .slice(0, POPUP_SLOTS.length)
    .map((button) => cleanOptionalAction(button));
  return {
    primary: kept[0] ?? blank,
    secondary: kept[1] ?? blank,
    tertiary: kept[2] ?? blank,
  };
}

export type ServiceDownloadDraft = { key: string; title: string; href: string };

export function cleanDownloadDrafts(value: unknown): ServiceDownloadDraft[] {
  if (!Array.isArray(value)) return [];
  const used = new Set<string>();
  const rows: ServiceDownloadDraft[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const title = String(record.title ?? "").trim().slice(0, 120);
    const href = String(record.href ?? "").trim().slice(0, 2000);
    if (!title || !href) continue;
    let key = String(record.key ?? "").trim().slice(0, 80);
    if (!key || used.has(key)) key = keyFrom(title, used);
    used.add(key);
    rows.push({ key, title, href });
  }
  return rows;
}

/** A document row is incomplete when only the name or only the file is filled in. */
export function incompleteDownloadDrafts(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return value.some((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const record = entry as Record<string, unknown>;
    const title = String(record.title ?? "").trim();
    const href = String(record.href ?? "").trim();
    return Boolean(title) !== Boolean(href);
  });
}

/** Documents already saved on a service, including ones whose catalog entry is missing. */
export function serviceDownloadRows(keys: unknown, catalog: unknown): ServiceDownloadDraft[] {
  if (!Array.isArray(keys)) return [];
  const map = catalog && typeof catalog === "object" ? catalog as Record<string, { title?: unknown; href?: unknown }> : {};
  const rows: ServiceDownloadDraft[] = [];
  for (const entry of keys) {
    const key = String(entry ?? "").trim();
    if (!key) continue;
    const found = map[key];
    rows.push({
      key,
      title: String(found?.title ?? "").trim(),
      href: String(found?.href ?? "").trim(),
    });
  }
  return rows;
}

export function applyServiceDownloads(
  catalog: Record<string, { title: string; href: string }>,
  previousKeys: string[],
  rows: ServiceDownloadDraft[],
  usedByOtherServices: Set<string>,
) {
  const next = { ...catalog };
  const taken = new Set(Object.keys(next));
  const keys: string[] = [];
  for (const row of rows) {
    let key = row.key.trim();
    const current = key ? next[key] : undefined;
    const changed = Boolean(current && (current.title !== row.title || current.href !== row.href));
    if (!key || (usedByOtherServices.has(key) && changed)) key = keyFrom(row.title || "document", taken);
    taken.add(key);
    next[key] = { title: row.title, href: row.href };
    keys.push(key);
  }
  for (const key of previousKeys) {
    if (!keys.includes(key) && !usedByOtherServices.has(key)) delete next[key];
  }
  return { catalog: next, keys };
}

export function toPublicServiceItem(row: ServiceRow, settings?: ServicesSettings | null) {
  const item: Record<string, unknown> = {
    slug: row.slug,
    title: row.title,
  };
  if (row.category) item.category = row.category;
  if (row.excerpt) item.excerpt = row.excerpt;
  if (row.detail) item.detail = row.detail;
  if (row.image_path) item.image = row.image_path;
  if (row.downloads?.length) item.downloads = row.downloads;
  if (row.source_popup_id) item.sourcePopupId = row.source_popup_id;
  item.actions = resolveServiceActions(row.actions, settings?.modal_actions ?? null);
  return item;
}

export function toPublicServicesPayload(
  settings: ServicesSettings | null,
  items: ServiceRow[]
) {
  return {
    intro: settings?.intro ?? "",
    items: items
      .filter((r) => r.status === "published")
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((row) => toPublicServiceItem(row, settings)),
    downloadCatalog: settings?.download_catalog ?? {},
    groupOrder: Array.isArray(settings?.group_order) ? settings.group_order : [],
    modalActions: cleanModalActions(settings?.modal_actions, true),
  };
}
