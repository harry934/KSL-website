import { revalidatePath } from "next/cache";
import { createDatabaseClient } from "@/lib/db-client";
import { listStoredFiles, removeStoredFile } from "@/lib/storage";
import { storageObjectFrom, type StorageObject } from "@/lib/storage-path";

type Admin = ReturnType<typeof createDatabaseClient>;

type Hunt = { table: string; columns: string[]; deleted: boolean };

const HUNTS: Hunt[] = [
  { table: "news_items", columns: ["image_path", "body_html"], deleted: true },
  { table: "event_items", columns: ["image_path", "body_html"], deleted: true },
  { table: "products", columns: ["image_path"], deleted: true },
  { table: "projects", columns: ["image_path"], deleted: true },
  { table: "csr_projects", columns: ["image_path"], deleted: true },
  { table: "service_items", columns: ["image_path"], deleted: true },
  { table: "gallery_photos", columns: ["storage_path", "public_url"], deleted: true },
  { table: "download_items", columns: ["external_href"], deleted: true },
  { table: "organization_board_members", columns: ["photo_url"], deleted: true },
  { table: "organization_milestones", columns: ["image_url"], deleted: true },
  { table: "press_assets", columns: ["href"], deleted: true },
  { table: "admin_profiles", columns: ["avatar_path"], deleted: true },
  { table: "site_image_overrides", columns: ["storage_path", "public_url", "media"], deleted: false },
];

const LOOKUPS = HUNTS.flatMap((hunt) =>
  hunt.columns.filter((column) => column !== "media").map((column) => ({ table: hunt.table, column }))
);

export type StorageBreakdown = {
  buckets: { bucket_id: string; bytes: number }[];
  bin: number;
  spare: number;
};

function textsIn(value: unknown, out: string[]) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((item) => textsIn(item, out));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => textsIn(item, out));
}

function objectsIn(value: unknown) {
  const texts: string[] = [];
  textsIn(value, texts);
  const seen = new Set<string>();
  const objects: StorageObject[] = [];
  for (const text of texts) {
    const object = storageObjectFrom(text);
    if (!object) continue;
    const key = `${object.bucket}/${object.path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    objects.push(object);
  }
  return objects;
}

async function stillUsed(admin: Admin, object: StorageObject) {
  for (const lookup of LOOKUPS) {
    const { data, error } = await admin.from(lookup.table).select("id").ilike(lookup.column, `%${object.path}`).limit(1);
    if (error) return true;
    if (data?.length) return true;
  }
  const { data, error } = await admin.from("site_image_overrides").select("media");
  if (error) return true;
  return (data ?? []).some((row) => JSON.stringify(row.media ?? "").includes(object.path));
}

/** Removes stored files that no row still points at. */
export async function releaseUnusedValues(admin: Admin, value: unknown) {
  const objects = objectsIn(value);
  let removed = false;
  for (const object of objects) {
    if (await stillUsed(admin, object)) continue;
    removed = (await removeStoredFile(object.bucket, object.path)) || removed;
    if (object.path.startsWith("avatars/")) {
      const other = object.bucket === "avatars" ? "media-public" : "avatars";
      removed = (await removeStoredFile(other, object.path)) || removed;
    }
  }
  if (removed) revalidatePath("/");
}

/** The file fields a save is about to replace. Pass the result to releaseUnusedValues after the save succeeds. */
export async function rememberFiles(admin: Admin, table: string, id: unknown, columns: string[], key = "id") {
  const value = String(id ?? "").trim();
  if (!value) return null;
  const { data } = await admin.from(table).select(columns.join(",")).eq(key, value).maybeSingle();
  return data ?? null;
}

type FileRef = { bucket: string; path: string; deleted: boolean };

async function loadFileRefs(admin: Admin): Promise<FileRef[] | null> {
  const refs: FileRef[] = [];
  for (const hunt of HUNTS) {
    const select = hunt.deleted ? [...hunt.columns, "deleted_at"].join(",") : hunt.columns.join(",");
    const { data, error } = await admin.from(hunt.table).select(select);
    if (error) return null;
    for (const row of (data ?? []) as unknown as Record<string, unknown>[]) {
      const deleted = hunt.deleted && Boolean(row.deleted_at);
      for (const object of objectsIn(hunt.columns.map((column) => row[column]))) {
        refs.push({ bucket: object.bucket, path: object.path, deleted });
      }
    }
  }
  return refs;
}

export type SpareFile = { bucket: string; path: string; bytes: number };

const SPARE_BUCKETS = new Set(["media-public", "downloads", "avatars"]);

function sparePathOk(path: string) {
  return Boolean(path) && !path.includes("..") && !path.startsWith("/") && /^[\w./ -]+$/.test(path);
}

/** Files in storage that no page and no recycle-bin row points at. */
export async function listSpareFiles(admin: Admin): Promise<SpareFile[] | null> {
  let data;
  try {
    data = await listStoredFiles();
  } catch {
    return null;
  }
  const refs = await loadFileRefs(admin);
  if (!refs) return null;
  const files: SpareFile[] = [];
  for (const row of data) {
    const bucket = String(row.bucket_id);
    const path = String(row.name);
    const bytes = Number(row.size_bytes) || 0;
    if (!SPARE_BUCKETS.has(bucket) || !sparePathOk(path)) continue;
    if (refs.some((ref) => ref.bucket === bucket && ref.path === path)) continue;
    files.push({ bucket, path, bytes });
  }
  files.sort((a, b) => b.bytes - a.bytes || a.path.localeCompare(b.path));
  return files;
}

/** Deletes one unlinked file. Linked files, including the recycle bin, are left alone. */
export async function removeSpareFile(admin: Admin, bucket: string, path: string) {
  if (!SPARE_BUCKETS.has(bucket) || !sparePathOk(path)) return { error: "That file could not be found.", status: 400 as const };
  const files = await listSpareFiles(admin);
  if (!files) return { error: "Could not check storage.", status: 500 as const };
  if (!files.some((file) => file.bucket === bucket && file.path === path)) {
    return { error: "That file is still used, so it was left in place.", status: 409 as const };
  }
  try {
    await removeStoredFile(bucket, path);
  } catch {
    return { error: "Could not delete that file.", status: 500 as const };
  }
  return { error: null, status: 200 as const };
}

/** Live files by bucket, plus bytes held only by the recycle bin or by nothing. */
export async function loadStorageBreakdown(admin: Admin): Promise<StorageBreakdown | null> {
  let data;
  try {
    data = await listStoredFiles();
  } catch {
    return null;
  }
  const refs = await loadFileRefs(admin);
  if (!refs) return null;

  const live = new Map<string, number>();
  let bin = 0;
  let spare = 0;
  for (const row of data) {
    const bucket = String(row.bucket_id);
    const name = String(row.name);
    const bytes = Number(row.size_bytes) || 0;
    if (!bucket || !name || bytes < 0) continue;
    const matches = refs.filter((ref) => ref.bucket === bucket && ref.path === name);
    if (matches.some((ref) => !ref.deleted)) live.set(bucket, (live.get(bucket) ?? 0) + bytes);
    else if (matches.some((ref) => ref.deleted)) bin += bytes;
    else spare += bytes;
  }

  return {
    buckets: [...live.entries()].map(([bucket_id, bytes]) => ({ bucket_id, bytes })),
    bin,
    spare,
  };
}
