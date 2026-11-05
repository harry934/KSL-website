import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { releaseUnusedValues } from "@/lib/storage-files";

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

export async function softDelete(admin: Admin, table: RecycleTable, id: string) {
  return admin.from(table).update({ deleted_at: new Date().toISOString() }).eq("id", id).is("deleted_at", null);
}

export async function restoreRow(admin: Admin, table: RecycleTable, id: string) {
  const result = await admin.from(table).update({ deleted_at: null }).eq("id", id).not("deleted_at", "is", null);
  if (!result.error) revalidatePath("/");
  return result;
}

/** Removes a row that is already in the recycle bin. A permanent delete also frees its file. */
export async function applyBinDelete(admin: Admin, table: RecycleTable, id: string, permanent: boolean) {
  if (!permanent) {
    const { error } = await softDelete(admin, table, id);
    if (!error) revalidatePath("/");
    return { error: error as BinError };
  }
  const { data, error } = await admin.from(table).delete().eq("id", id).not("deleted_at", "is", null).select("*");
  if (error) return { error: error as BinError };
  if (!data?.length) return { error: { message: "That item is not in the recycle bin.", code: "bin" } };
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
  const { error: banErr } = await admin.auth.admin.updateUserById(id, { ban_duration: "none" });
  if (banErr) return { error: { message: "Could not restore this account.", code: "restore" } };
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
  if (data.avatar_path) {
    await admin.storage.from("avatars").remove([data.avatar_path]);
    await admin.storage.from("media-public").remove([data.avatar_path]);
  }
  const { error: deleteErr } = await admin.auth.admin.deleteUser(id);
  if (!deleteErr) {
    revalidatePath("/");
    return { error: null };
  }
  // Auth user may already be gone; still clear the profile row so the bin can empty.
  const { data: removed, error: profileErr } = await admin
    .from("admin_profiles")
    .delete()
    .eq("id", id)
    .not("deleted_at", "is", null)
    .select("id");
  if (profileErr) return { error: { message: "Could not delete this account.", code: "delete" } };
  if (!removed?.length) return { error: { message: "That item is not in the recycle bin.", code: "bin" } };
  revalidatePath("/");
  return { error: null };
}
