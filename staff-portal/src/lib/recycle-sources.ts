import type { ModuleKey } from "@/lib/modules";

export type RecycleSource = {
  table: string;
  module: ModuleKey;
  section: string;
  entityType: string;
  /** Messages use the delete permission to put a row back. Everything else uses edit. */
  restore: "edit" | "delete";
  select: string;
  title: (row: Record<string, unknown>) => string;
};

export const RECYCLE_SOURCES: RecycleSource[] = [
  { table: "news_items", module: "news", section: "News", entityType: "news_item", restore: "edit", select: "id, title, deleted_at", title: (row) => text(row.title, "Untitled article") },
  { table: "event_items", module: "events", section: "Events", entityType: "event_item", restore: "edit", select: "id, title, deleted_at", title: (row) => text(row.title, "Untitled event") },
  { table: "download_items", module: "downloads", section: "Downloads", entityType: "download_item", restore: "edit", select: "id, title, deleted_at", title: (row) => text(row.title, "Untitled document") },
  { table: "gallery_photos", module: "gallery", section: "Gallery", entityType: "gallery_photo", restore: "edit", select: "id, title, deleted_at", title: (row) => text(row.title, "Untitled photo") },
  { table: "gallery_videos", module: "gallery", section: "Gallery", entityType: "gallery_video", restore: "edit", select: "id, title, deleted_at", title: (row) => text(row.title, "Untitled video") },
  { table: "products", module: "products", section: "Products", entityType: "product", restore: "edit", select: "id, name, deleted_at", title: (row) => text(row.name, "Untitled product") },
  { table: "projects", module: "projects", section: "Projects", entityType: "project", restore: "edit", select: "id, title, deleted_at", title: (row) => text(row.title, "Untitled project") },
  { table: "career_listings", module: "careers", section: "Careers", entityType: "career_listing", restore: "edit", select: "id, title, deleted_at", title: (row) => text(row.title, "Untitled listing") },
  { table: "csr_projects", module: "csr", section: "Community (CSR)", entityType: "csr_project", restore: "edit", select: "id, title, deleted_at", title: (row) => text(row.title, "Untitled programme") },
  { table: "press_assets", module: "press", section: "Press kit", entityType: "press_asset", restore: "edit", select: "id, title, deleted_at", title: (row) => text(row.title, "Untitled item") },
  { table: "service_items", module: "services", section: "Services", entityType: "service_item", restore: "edit", select: "id, title, deleted_at", title: (row) => text(row.title, "Untitled service") },
  { table: "faq_groups", module: "faq", section: "Questions (FAQ)", entityType: "faq_group", restore: "edit", select: "id, title, deleted_at", title: (row) => text(row.title, "Untitled group") },
  { table: "faq_items", module: "faq", section: "Questions (FAQ)", entityType: "faq_item", restore: "edit", select: "id, question, deleted_at", title: (row) => text(row.question, "Untitled question") },
  { table: "organization_leadership", module: "organization", section: "Organisation", entityType: "organization_leadership", restore: "edit", select: "id, role, deleted_at", title: (row) => text(row.role, "Leadership role") },
  { table: "organization_board_members", module: "organization", section: "Organisation", entityType: "organization_board_members", restore: "edit", select: "id, full_name, deleted_at", title: (row) => text(row.full_name, "Board member") },
  {
    table: "website_messages",
    module: "messages",
    section: "Messages",
    entityType: "website_message",
    restore: "delete",
    select: "id, subject, first_name, surname, deleted_at",
    title: (row) => {
      const who = [row.first_name, row.surname].map((part) => text(part, "")).filter(Boolean).join(" ");
      const subject = text(row.subject, "Message");
      return who ? `${subject} — ${who}` : subject;
    },
  },
];

function text(value: unknown, fallback: string) {
  const label = String(value ?? "").trim();
  return label || fallback;
}

export const RECYCLE_MODULES = [...new Set(RECYCLE_SOURCES.map((source) => source.module))];
