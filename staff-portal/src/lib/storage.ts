import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { constants } from "node:fs";
import { mkdir, open, readFile, realpath, rm, statfs } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { currentBasePath } from "@/lib/base-path";
import { query } from "@/lib/db";

const BUCKETS = new Set(["media-public", "downloads", "avatars"]);
const PUBLIC_BUCKET = "media-public";

function safePath(value: string) {
  if (
    !value ||
    value.startsWith("/") ||
    value.includes("\\") ||
    value.includes("\0") ||
    value.split("/").some((part) => !part || part === "." || part === "..") ||
    !/^[a-zA-Z0-9._ -]+(?:\/[a-zA-Z0-9._ -]+)*$/.test(value)
  ) {
    throw new Error("Invalid storage path");
  }
  return value;
}

function storageRoot() {
  const configured = process.env.STORAGE_DIR?.trim();
  if (process.env.NODE_ENV === "production" && !configured) {
    throw new Error("STORAGE_DIR is required in production");
  }
  const root = path.resolve(configured || path.join(os.tmpdir(), "ksl-staff-portal-storage"));
  const appRoot = path.resolve(process.cwd());
  if (root === appRoot || root.startsWith(`${appRoot}${path.sep}`)) {
    throw new Error("STORAGE_DIR must be outside the application directory");
  }
  return root;
}

async function ensureStorageRoot() {
  const root = storageRoot();
  await mkdir(root, { recursive: true, mode: 0o700 });
  const resolved = await realpath(root);
  if (resolved !== root) throw new Error("STORAGE_DIR must not resolve through a symlink");
  return root;
}

/** Disk capacity for STORAGE_DIR (phone-style used / free / total). */
export async function storageDiskCapacity(): Promise<{ total: number; free: number } | null> {
  try {
    const root = await ensureStorageRoot();
    const stats = await statfs(root);
    const total = Number(stats.bsize) * Number(stats.blocks);
    const free = Number(stats.bsize) * Number(stats.bavail);
    if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(free) || free < 0) return null;
    return { total, free: Math.min(free, total) };
  } catch {
    return null;
  }
}

async function filePath(bucket: string, value: string, createParent: boolean) {
  if (!BUCKETS.has(bucket)) throw new Error("Invalid storage bucket");
  const relative = safePath(value);
  const root = await ensureStorageRoot();
  const target = path.resolve(root, bucket, relative);
  if (!target.startsWith(`${root}${path.sep}`)) throw new Error("Invalid storage path");
  if (createParent) await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  const parent = await realpath(path.dirname(target));
  if (!parent.startsWith(`${root}${path.sep}`)) throw new Error("Storage path escapes STORAGE_DIR");
  return target;
}

function signingSecret() {
  const secret = process.env.STORED_FILE_SIGNING_SECRET?.trim();
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error("STORED_FILE_SIGNING_SECRET must contain at least 32 bytes");
  }
  return secret;
}

function signature(bucket: string, file: string, expires: number) {
  return createHmac("sha256", signingSecret())
    .update(`${bucket}\n${file}\n${expires}`)
    .digest("base64url");
}

export function verifyStoredFileSignature(bucket: string, file: string, expires: number, sig: string) {
  if (!Number.isSafeInteger(expires) || expires <= Math.floor(Date.now() / 1000)) return false;
  const expected = Buffer.from(signature(bucket, safePath(file), expires));
  const actual = Buffer.from(sig);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function portalUrl() {
  const configured = process.env.NEXT_PUBLIC_PORTAL_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
  throw new Error("NEXT_PUBLIC_PORTAL_URL is required in production");
}

/** Origin + optional /kwela base path. `new URL("/api/...", portal)` would drop /kwela. */
function portalApiRoot() {
  const portal = portalUrl();
  const base = currentBasePath();
  try {
    const url = new URL(portal);
    const pathName = url.pathname.replace(/\/+$/, "");
    if (base && (pathName === base || pathName.endsWith(base))) return portal;
    if (base) {
      url.pathname = `${base}/`;
      return url.toString().replace(/\/+$/, "");
    }
    return portal;
  } catch {
    return portal;
  }
}

export function storedFileUrl(bucket: string, file: string) {
  if (!BUCKETS.has(bucket)) throw new Error("Invalid storage bucket");
  // Keep /kwela (or other basePath) — absolute "/api/..." would resolve at the host root.
  const url = new URL(`${portalApiRoot()}/api/stored-file`);
  url.searchParams.set("bucket", bucket);
  url.searchParams.set("path", safePath(file));
  return url.toString();
}

export function signedStoredFileUrl(bucket: string, file: string, seconds = 3600) {
  if (!Number.isInteger(seconds) || seconds < 1 || seconds > 86_400) {
    throw new Error("Invalid stored-file URL lifetime");
  }
  const safe = safePath(file);
  const expires = Math.floor(Date.now() / 1000) + seconds;
  const url = new URL(storedFileUrl(bucket, safe));
  url.searchParams.set("expires", String(expires));
  url.searchParams.set("signature", signature(bucket, safe, expires));
  return url.toString();
}

export async function saveStoredFile(bucket: string, file: string, bytes: Buffer, contentType: string) {
  const target = await filePath(bucket, file, true);
  const handle = await open(target, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  try {
    // Skip fsync — awaiting sync on large PDFs can hang the request after the
    // bytes are already written, so the browser spinner never finishes.
    await handle.writeFile(bytes);
  } catch (error) {
    await handle.close().catch(() => null);
    await rm(target, { force: true });
    throw error;
  }
  await handle.close();

  try {
    await query(
      `INSERT INTO stored_files (id, bucket_id, name, size_bytes, content_type)
       VALUES ($1, $2, $3, $4, $5)`,
      [randomUUID(), bucket, safePath(file), bytes.byteLength, contentType],
    );
  } catch (error) {
    await rm(target, { force: true });
    throw error;
  }
}

export async function loadStoredFile(bucket: string, file: string) {
  const safe = safePath(file);
  const result = await query<{ content_type: string; size_bytes: string }>(
    "SELECT content_type, size_bytes FROM stored_files WHERE bucket_id = $1 AND name = $2",
    [bucket, safe],
  );
  if (!result.rows[0]) return null;
  const target = await filePath(bucket, safe, false);
  const handle = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const bytes = await readFile(handle);
    return { bytes, contentType: result.rows[0].content_type, size: Number(result.rows[0].size_bytes) };
  } finally {
    await handle.close();
  }
}

export async function removeStoredFile(bucket: string, file: string) {
  const safe = safePath(file);
  const found = await query(
    "SELECT 1 FROM stored_files WHERE bucket_id = $1 AND name = $2",
    [bucket, safe],
  );
  if (!found.rowCount) return false;
  const target = await filePath(bucket, safe, false);
  await rm(target, { force: true });
  const result = await query("DELETE FROM stored_files WHERE bucket_id = $1 AND name = $2", [bucket, safe]);
  return (result.rowCount ?? 0) > 0;
}

export async function listStoredFiles() {
  const result = await query<{ bucket_id: string; name: string; size_bytes: string; content_type: string; created_at: Date }>(
    "SELECT bucket_id, name, size_bytes, content_type, created_at FROM stored_files ORDER BY created_at DESC",
  );
  return result.rows;
}

export function isPublicStorageBucket(bucket: string) {
  return bucket === PUBLIC_BUCKET;
}
