import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { constants } from "node:fs";
import { mkdir, open, readFile, realpath, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { query } from "@/lib/db";

const BUCKETS = new Set(["media-public", "downloads", "avatars"]);

export type ChunkUploadMeta = {
  id: string;
  userId: string;
  module: string;
  bucket: string;
  path: string;
  name: string;
  contentType: string;
  ext: string;
  size: number;
  received: number;
  createdAt: number;
};

function storageRoot() {
  const configured = process.env.STORAGE_DIR?.trim();
  if (process.env.NODE_ENV === "production" && !configured) {
    throw new Error("STORAGE_DIR is required in production");
  }
  return path.resolve(configured || path.join("/tmp", "ksl-staff-portal-storage"));
}

function signingSecret() {
  const secret = process.env.STORED_FILE_SIGNING_SECRET?.trim();
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error("STORED_FILE_SIGNING_SECRET must contain at least 32 bytes");
  }
  return secret;
}

async function incomingRoot() {
  const root = storageRoot();
  const dir = path.resolve(root, ".incoming");
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const resolved = await realpath(dir);
  if (!resolved.startsWith(root)) throw new Error("Invalid incoming directory");
  return resolved;
}

function sessionPaths(root: string, id: string) {
  if (!/^[a-f0-9-]{36}$/i.test(id)) throw new Error("Invalid upload id");
  const dir = path.resolve(root, id);
  if (!dir.startsWith(root + path.sep)) throw new Error("Invalid upload id");
  return {
    dir,
    meta: path.join(dir, "meta.json"),
    data: path.join(dir, "data.bin"),
  };
}

function safeStoragePath(value: string) {
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

export function signUploadId(id: string, userId: string) {
  return createHmac("sha256", signingSecret()).update(`${id}\n${userId}`).digest("base64url");
}

export function verifyUploadId(id: string, userId: string, sig: string) {
  const expected = Buffer.from(signUploadId(id, userId));
  const actual = Buffer.from(sig);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function createChunkUpload(input: Omit<ChunkUploadMeta, "id" | "received" | "createdAt" | "path"> & { path: string }) {
  if (!BUCKETS.has(input.bucket)) throw new Error("Invalid storage bucket");
  const root = await incomingRoot();
  const id = randomUUID();
  const paths = sessionPaths(root, id);
  await mkdir(paths.dir, { recursive: true, mode: 0o700 });
  const handle = await open(paths.data, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  await handle.close();
  const meta: ChunkUploadMeta = {
    id,
    userId: input.userId,
    module: input.module,
    bucket: input.bucket,
    path: safeStoragePath(input.path),
    name: input.name,
    contentType: input.contentType,
    ext: input.ext,
    size: input.size,
    received: 0,
    createdAt: Date.now(),
  };
  await writeFile(paths.meta, JSON.stringify(meta), { mode: 0o600 });
  return meta;
}

export async function loadChunkUpload(id: string, userId: string): Promise<ChunkUploadMeta> {
  const root = await incomingRoot();
  const paths = sessionPaths(root, id);
  const raw = await readFile(paths.meta, "utf8");
  const meta = JSON.parse(raw) as ChunkUploadMeta;
  if (meta.userId !== userId || meta.id !== id) throw new Error("Upload session not found");
  if (Date.now() - meta.createdAt > 60 * 60 * 1000) {
    await rm(paths.dir, { recursive: true, force: true });
    throw new Error("Upload session expired. Please try again.");
  }
  return meta;
}

export async function appendChunk(id: string, userId: string, offset: number, chunk: Buffer) {
  const root = await incomingRoot();
  const paths = sessionPaths(root, id);
  const meta = await loadChunkUpload(id, userId);
  if (offset !== meta.received) {
    throw new Error("Upload chunks arrived out of order. Please try again.");
  }
  if (meta.received + chunk.byteLength > meta.size) {
    throw new Error("Upload is larger than declared.");
  }
  const handle = await open(paths.data, constants.O_WRONLY | constants.O_NOFOLLOW);
  try {
    await handle.write(chunk, 0, chunk.byteLength, meta.received);
  } finally {
    await handle.close();
  }
  meta.received += chunk.byteLength;
  await writeFile(paths.meta, JSON.stringify(meta), { mode: 0o600 });
  return meta;
}

export async function finishChunkUpload(id: string, userId: string) {
  const root = await incomingRoot();
  const paths = sessionPaths(root, id);
  const meta = await loadChunkUpload(id, userId);
  if (meta.received !== meta.size) {
    throw new Error("Upload is incomplete. Please try again.");
  }
  const info = await stat(paths.data);
  if (info.size !== meta.size) {
    throw new Error("Upload size mismatch. Please try again.");
  }

  const storageRootPath = storageRoot();
  const finalPath = path.resolve(storageRootPath, meta.bucket, meta.path);
  if (!finalPath.startsWith(path.resolve(storageRootPath, meta.bucket) + path.sep)) {
    throw new Error("Invalid storage path");
  }
  await mkdir(path.dirname(finalPath), { recursive: true, mode: 0o700 });
  await rename(paths.data, finalPath);

  try {
    await query(
      `INSERT INTO stored_files (id, bucket_id, name, size_bytes, content_type)
       VALUES ($1, $2, $3, $4, $5)`,
      [randomUUID(), meta.bucket, meta.path, meta.size, meta.contentType],
    );
  } catch (error) {
    await rm(finalPath, { force: true });
    await rm(paths.dir, { recursive: true, force: true }).catch(() => null);
    throw error;
  }

  await rm(paths.dir, { recursive: true, force: true }).catch(() => null);
  return meta;
}

export async function abortChunkUpload(id: string, userId: string) {
  const root = await incomingRoot();
  const paths = sessionPaths(root, id);
  try {
    const meta = await loadChunkUpload(id, userId);
    if (meta.userId !== userId) return;
  } catch {
    return;
  }
  await rm(paths.dir, { recursive: true, force: true }).catch(() => null);
}

/** Read the first bytes of an in-progress/finished temp file for type checks. */
export async function peekChunkUpload(id: string, userId: string, maxBytes = 64) {
  const root = await incomingRoot();
  const paths = sessionPaths(root, id);
  await loadChunkUpload(id, userId);
  const handle = await open(paths.data, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const buf = Buffer.alloc(maxBytes);
    const result = await handle.read(buf, 0, maxBytes, 0);
    return buf.subarray(0, result.bytesRead);
  } finally {
    await handle.close();
  }
}
