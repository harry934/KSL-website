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
  | "messages"
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
  messages: "/messages",
  staff: "/staff",
};

export const MODULE_LABELS: Record<ModuleKey, string> = {
  news: "News",
  events: "Events",
  gallery: "Gallery",
  services: "Services",
  products: "Products",
  careers: "Careers",
  faq: "Questions (FAQ)",
  csr: "Community (CSR)",
  downloads: "Downloads",
  organization: "Organisation",
  press: "Press kit",
  site_settings: "Site settings",
  messages: "Messages",
  staff: "Staff",
};

export const MODULE_GROUPS: { label: string; modules: ModuleKey[] }[] = [
  { label: "Content", modules: ["news", "events", "gallery", "press"] },
  { label: "Company", modules: ["services", "products", "organization", "careers", "csr"] },
  { label: "Resources", modules: ["faq", "downloads", "messages"] },
  { label: "Administration", modules: ["staff", "site_settings"] },
];

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
