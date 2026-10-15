export type ModuleKey =
  | "news"
  | "events"
  | "gallery"
  | "services"
  | "products"
  | "careers"
  | "faq"
  | "csr"
  | "downloads"
  | "organization"
  | "press"
  | "site_settings"
  | "staff";

export type ModulePermission = {
  module_key: ModuleKey;
  can_view: boolean;
  can_edit: boolean;
  can_publish: boolean;
  can_delete: boolean;
};

export const MODULE_ROUTES: Record<ModuleKey, string> = {
  news: "/news",
  events: "/events",
  gallery: "/gallery",
  services: "/services",
  products: "/products",
  careers: "/careers",
  faq: "/faq",
  csr: "/csr",
  downloads: "/downloads",
  organization: "/organization",
  press: "/press",
  site_settings: "/settings",
  staff: "/staff",
};

export const MODULE_LABELS: Record<ModuleKey, string> = {
  news: "News",
  events: "Events",
  gallery: "Gallery",
  services: "Services",
  products: "Products",
  careers: "Careers",
  faq: "FAQ",
  csr: "CSR",
  downloads: "Downloads",
  organization: "Organization",
  press: "Press",
  site_settings: "Site settings",
  staff: "Staff",
};

export function canAccess(
  permissions: ModulePermission[],
  module: ModuleKey,
  action: "view" | "edit" | "publish" | "delete",
  isSuperAdmin: boolean
): boolean {
  if (isSuperAdmin) return true;
  const row = permissions.find((p) => p.module_key === module);
  if (!row) return false;
  switch (action) {
    case "view":
      return row.can_view;
    case "edit":
      return row.can_edit;
    case "publish":
      return row.can_publish;
    case "delete":
      return row.can_delete;
    default:
      return false;
  }
}
