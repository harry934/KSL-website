import { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

export const RECYCLE_DAYS = 14;

export async function purgeRecycle(admin: Admin, table: "news_items" | "event_items" | "download_items") {
  const cutoff = new Date(Date.now() - RECYCLE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await admin.from(table).delete().lt("deleted_at", cutoff);
}

export async function softDelete(admin: Admin, table: "news_items" | "event_items" | "download_items", id: string) {
  await purgeRecycle(admin, table);
  return admin.from(table).update({ deleted_at: new Date().toISOString() }).eq("id", id);
}

export async function restoreRow(admin: Admin, table: "news_items" | "event_items" | "download_items", id: string) {
  return admin.from(table).update({ deleted_at: null }).eq("id", id);
}

export function splitRemoved<T extends { deleted_at?: string | null }>(rows: T[]) {
  return {
    items: rows.filter((row) => !row.deleted_at),
    removed: rows.filter((row) => row.deleted_at),
  };
}
