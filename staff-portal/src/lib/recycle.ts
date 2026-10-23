import { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

export const RECYCLE_TABLES = [
  "news_items",
  "event_items",
  "download_items",
  "gallery_photos",
  "gallery_videos",
  "products",
  "projects",
  "career_listings",
  "csr_projects",
  "press_assets",
  "service_items",
  "faq_groups",
  "faq_items",
  "organization_leadership",
  "organization_board_members",
  "website_messages",
] as const;

export type RecycleTable = (typeof RECYCLE_TABLES)[number];

type BinError = { message?: string; code?: string } | null;

export function kept<T extends { deleted_at?: string | null }>(rows: T[] | null | undefined) {
  return (rows ?? []).filter((row) => !row.deleted_at);
}

export function splitRemoved<T extends { deleted_at?: string | null }>(rows: T[]) {
  return {
    items: rows.filter((row) => !row.deleted_at),
    removed: rows.filter((row) => row.deleted_at),
  };
}

export async function softDelete(admin: Admin, table: RecycleTable, id: string) {
  return admin.from(table).update({ deleted_at: new Date().toISOString() }).eq("id", id).is("deleted_at", null);
}

export async function restoreRow(admin: Admin, table: RecycleTable, id: string) {
  return admin.from(table).update({ deleted_at: null }).eq("id", id).not("deleted_at", "is", null);
}

/** Removes a row that is already in the recycle bin. */
export async function applyBinDelete(admin: Admin, table: RecycleTable, id: string, permanent: boolean) {
  if (!permanent) {
    const { error } = await softDelete(admin, table, id);
    return { error: error as BinError };
  }
  const { data, error } = await admin.from(table).delete().eq("id", id).not("deleted_at", "is", null).select("id");
  if (error) return { error: error as BinError };
  if (!data?.length) return { error: { message: "That item is not in the recycle bin.", code: "bin" } };
  return { error: null };
}
