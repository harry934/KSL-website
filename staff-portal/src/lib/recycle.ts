import { revalidatePath } from "next/cache";
import { createDatabaseClient } from "@/lib/db-client";
import { canAccess, type ModulePermission } from "@/lib/modules";
import { RECYCLE_SOURCES } from "@/lib/recycle-sources";
import { releaseUnusedValues } from "@/lib/storage-files";
import { removeStoredFile } from "@/lib/storage";

type Admin = ReturnType<typeof createDatabaseClient>;

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
  "organization_milestones",
  "website_messages",
  "admin_profiles",
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

export type BinItem = {
  id: string;
  title: string;
  section: string;
  table: string;
  deletedAt: string;
  canRestore: boolean;
  canDelete: boolean;
};

/** Rows currently in the bin. A table that cannot be read is reported so the page does not look empty by mistake. */
export async function listBinItems(viewer: { permissions: ModulePermission[]; isSuperAdmin: boolean }): Promise<{ items: BinItem[]; error: string | null }> {
  const admin = createDatabaseClient();
  const items: BinItem[] = [];
  let errorMessage: string | null = null;
  for (const source of RECYCLE_SOURCES) {
    const canView = canAccess(viewer.permissions, source.module, "view", viewer.isSuperAdmin);
    const canDelete = canAccess(viewer.permissions, source.module, "delete", viewer.isSuperAdmin);
    if (!canView && !canDelete) continue;
    const { data, error } = await admin
      .from(source.table as RecycleTable)
      .select(source.select)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false })
      .limit(100);
    if (error) {
      errorMessage ??= "The recycle bin could not be loaded.";
      continue;
    }
    const canRestore = canAccess(viewer.permissions, source.module, source.restore, viewer.isSuperAdmin);
    for (const row of (data ?? []) as unknown as Record<string, unknown>[]) {
      const id = String(row.id ?? "");
      if (!id) continue;
      items.push({
        id,
        title: source.title(row),
        section: source.section,
        table: source.table,
        deletedAt: String(row.deleted_at ?? ""),
        canRestore,
        canDelete,
      });
    }
  }
  return { items, error: errorMessage };
}

/** Staff accounts and inbox messages stay soft-deleted so they can be restored. */
const SOFT_DELETE_TABLES = new Set<RecycleTable>(["admin_profiles", "website_messages"]);

export async function softDelete(admin: Admin, table: RecycleTable, id: string) {
  return admin.from(table).update({ deleted_at: new Date().toISOString() }).eq("id", id).is("deleted_at", null);
}

export async function restoreRow(admin: Admin, table: RecycleTable, id: string) {
  const result = await admin.from(table).update({ deleted_at: null }).eq("id", id).not("deleted_at", "is", null);
  if (!result.error) revalidatePath("/");
  return result;
}

/**
 * Deletes a content row from PostgreSQL.
 * Content modules are hard-deleted (row removed). Staff/messages stay soft-deleted unless `permanent`.
 * Unused media files are released when nothing else references them.
 */
export async function applyBinDelete(admin: Admin, table: RecycleTable, id: string, permanent: boolean) {
  if (!permanent && SOFT_DELETE_TABLES.has(table)) {
    const { error } = await softDelete(admin, table, id);
    if (!error) revalidatePath("/");
    return { error: error as BinError };
  }

  // Hard-delete the live or already-binned row.
  const { data, error } = await admin.from(table).delete().eq("id", id).select("*");
  if (error) return { error: error as BinError };
  if (!data?.length) return { error: { message: "That item was not found.", code: "bin" } };
  await releaseUnusedValues(admin, data[0]);
  revalidatePath("/");
  return { error: null };
}

/** Puts a staff account back and lets that person sign in again. */
export async function restoreStaffAccount(admin: Admin, id: string) {
  const { data, error } = await admin
    .from("admin_profiles")
    .update({ deleted_at: null })
    .eq("id", id)
    .not("deleted_at", "is", null)
    .select("id");
  if (error) return { error: error as BinError };
  if (!data?.length) return { error: { message: "That item is not in the recycle bin.", code: "bin" } };
  revalidatePath("/");
  return { error: null };
}

/** Removes a staff account that is already in the recycle bin, including its sign-in. */
export async function purgeStaffAccount(admin: Admin, id: string) {
  const { data, error } = await admin
    .from("admin_profiles")
    .select("id, deleted_at, avatar_path")
    .eq("id", id)
    .maybeSingle();
  if (error) return { error: error as BinError };
  if (!data?.deleted_at) {
    return { error: { message: "That item is not in the recycle bin.", code: "bin" } };
  }
  const { data: removed, error: profileErr } = await admin
    .from("admin_profiles")
    .delete()
    .eq("id", id)
    .not("deleted_at", "is", null)
    .select("id");
  if (profileErr) return { error: { message: "Could not delete this account.", code: "delete" } };
  if (!removed?.length) return { error: { message: "That item is not in the recycle bin.", code: "bin" } };
  if (data.avatar_path) {
    await removeStoredFile("avatars", data.avatar_path);
    await removeStoredFile("media-public", data.avatar_path);
  }
  revalidatePath("/");
  return { error: null };
}
