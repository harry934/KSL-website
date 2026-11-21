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
