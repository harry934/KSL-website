import { MODULE_ROUTES, type ModuleKey } from "@/lib/modules";

const ITEM_PAGES: Record<string, string> = {
  news_item: "/news",
  event_item: "/events",
  project: "/projects",
  product: "/products",
  career_listing: "/careers",
  download_item: "/downloads",
  csr_project: "/csr",
  service_item: "/services",
  press_asset: "/press",
  gallery_photo: "/gallery",
  gallery_video: "/gallery",
};

function modulePage(moduleKey: string | null) {
  if (moduleKey && moduleKey in MODULE_ROUTES && moduleKey !== "staff") return MODULE_ROUTES[moduleKey as ModuleKey];
  return "";
}

/** Where a staff change should open: the item itself, or its section when there is no single item. */
export function activityPlace(row: {
  id: string;
  module_key: string | null;
  entity_type: string | null;
  entity_id: string | null;
}) {
  const type = row.entity_type ?? "";
  const entityId = row.entity_id ?? "";
  if (type === "website_message" && entityId) return `/messages?id=${encodeURIComponent(entityId)}`;
  if (type === "site_setting" && entityId === "announcement") return "/banner";
  if (type === "site_image" && entityId) return `/images?slot=${encodeURIComponent(entityId)}`;
  if (type === "admin_profile") return `/activity?entry=${encodeURIComponent(row.id)}`;

  const page = ITEM_PAGES[type] || modulePage(row.module_key);
  if (!page) return `/activity?entry=${encodeURIComponent(row.id)}`;
  if (entityId && entityId !== "default" && ITEM_PAGES[type]) return `${page}?edit=${encodeURIComponent(entityId)}`;
  return page;
}
