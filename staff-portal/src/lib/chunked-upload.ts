import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { constants } from "node:fs";
import { mkdir, open, readFile, readdir, realpath, rename, rm, stat, writeFile } from "node:fs/promises";
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
  /** Contiguous bytes from offset 0 that are complete. */
  received: number;
  /** Total bytes stored across all parts (may be ahead of received when parallel). */
  filled: number;
  /** offset -> length for accepted parts */
  parts: Record<string, number>;
  createdAt: number;
};

const locks = new Map<string, Promise<unknown>>();

function withUploadLock<T>(id: string, work: () => Promise<T>): Promise<T> {
  const previous = locks.get(id) ?? Promise.resolve();
  const run = previous.catch(() => undefined).then(work);
  locks.set(
    id,
    run.then(
      () => undefined,
      () => undefined
    )
  );
  return run;
}

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
    parts: path.join(dir, "parts"),
  };
}

function partPath(paths: ReturnType<typeof sessionPaths>, offset: number) {
  if (!Number.isInteger(offset) || offset < 0) throw new Error("Invalid upload offset");
  return path.join(paths.parts, `${offset}.part`);
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

function recomputeProgress(meta: ChunkUploadMeta) {
  let filled = 0;
  for (const length of Object.values(meta.parts)) filled += length;
  let received = 0;
  while (received < meta.size) {
    const length = meta.parts[String(received)];
    if (!length) break;
    received += length;
  }
  meta.filled = filled;
  meta.received = received;
}

export function signUploadId(id: string, userId: string) {
  return createHmac("sha256", signingSecret()).update(`${id}\n${userId}`).digest("base64url");
}

export function verifyUploadId(id: string, userId: string, sig: string) {
  const expected = Buffer.from(signUploadId(id, userId));
  const actual = Buffer.from(sig);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function createChunkUpload(
  input: Omit<ChunkUploadMeta, "id" | "received" | "filled" | "parts" | "createdAt" | "path"> & { path: string }
) {
  if (!BUCKETS.has(input.bucket)) throw new Error("Invalid storage bucket");
  const root = await incomingRoot();
  const id = randomUUID();
  const paths = sessionPaths(root, id);
  await mkdir(paths.dir, { recursive: true, mode: 0o700 });
  await mkdir(paths.parts, { recursive: true, mode: 0o700 });
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
    filled: 0,
    parts: {},
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
  if (!meta.parts || typeof meta.parts !== "object") meta.parts = {};
  if (!Number.isFinite(meta.filled)) meta.filled = meta.received || 0;
  return meta;
}

export async function appendChunk(id: string, userId: string, offset: number, chunk: Buffer) {
  return withUploadLock(id, async () => {
    const root = await incomingRoot();
    const paths = sessionPaths(root, id);
    const meta = await loadChunkUpload(id, userId);
    if (!Number.isInteger(offset) || offset < 0) throw new Error("Invalid upload offset.");
    if (offset + chunk.byteLength > meta.size) throw new Error("Upload is larger than declared.");
    if (!chunk.byteLength) throw new Error("Invalid upload chunk size.");

    const existing = meta.parts[String(offset)];
    if (existing) {
      if (existing !== chunk.byteLength) throw new Error("Upload chunk size mismatch. Please try again.");
      recomputeProgress(meta);
      return meta;
    }

    // Reject overlapping ranges with an already-accepted part.
    for (const [startRaw, length] of Object.entries(meta.parts)) {
      const start = Number(startRaw);
      const end = start + length;
      const nextEnd = offset + chunk.byteLength;
      if (offset < end && nextEnd > start) {
        throw new Error("Upload chunks overlapped. Please try again.");
      }
    }

    await mkdir(paths.parts, { recursive: true, mode: 0o700 });
    const target = partPath(paths, offset);
    const temp = `${target}.${randomUUID().slice(0, 8)}.tmp`;
    await writeFile(temp, chunk, { mode: 0o600 });
    await rename(temp, target);

    meta.parts[String(offset)] = chunk.byteLength;
    recomputeProgress(meta);
    await writeFile(paths.meta, JSON.stringify(meta), { mode: 0o600 });
    return meta;
  });
}

async function assembleParts(paths: ReturnType<typeof sessionPaths>, meta: ChunkUploadMeta) {
  const handle = await open(paths.data, constants.O_WRONLY | constants.O_TRUNC | constants.O_NOFOLLOW);
  try {
    let offset = 0;
    while (offset < meta.size) {
      const length = meta.parts[String(offset)];
      if (!length) throw new Error("Upload is incomplete. Please try again.");
      const bytes = await readFile(partPath(paths, offset));
      if (bytes.byteLength !== length) throw new Error("Upload part is damaged. Please try again.");
      let written = 0;
      while (written < bytes.byteLength) {
        const result = await handle.write(bytes, written, bytes.byteLength - written, offset + written);
        if (!result.bytesWritten) throw new Error("Could not assemble upload.");
        written += result.bytesWritten;
      }
      offset += length;
    }
  } finally {
    await handle.close();
  }
}

export async function finishChunkUpload(id: string, userId: string) {
  return withUploadLock(id, async () => {
    const root = await incomingRoot();
    const paths = sessionPaths(root, id);
    const meta = await loadChunkUpload(id, userId);
    recomputeProgress(meta);
    if (meta.received !== meta.size || meta.filled !== meta.size) {
      throw new Error("Upload is incomplete. Please try again.");
    }

    await assembleParts(paths, meta);
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
        [randomUUID(), meta.bucket, meta.path, meta.size, meta.contentType]
      );
    } catch (error) {
      await rm(finalPath, { force: true });
      await rm(paths.dir, { recursive: true, force: true }).catch(() => null);
      throw error;
    }

    await rm(paths.dir, { recursive: true, force: true }).catch(() => null);
    return meta;
  });
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
  const meta = await loadChunkUpload(id, userId);
  const firstLength = meta.parts["0"];
  if (firstLength) {
    const bytes = await readFile(partPath(paths, 0));
    return bytes.subarray(0, Math.min(maxBytes, bytes.byteLength));
  }
  // Legacy sequential uploads wrote directly into data.bin.
  try {
    const handle = await open(paths.data, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const buf = Buffer.alloc(maxBytes);
      const result = await handle.read(buf, 0, maxBytes, 0);
      return buf.subarray(0, result.bytesRead);
    } finally {
      await handle.close();
    }
  } catch {
    return Buffer.alloc(0);
  }
}

/** Test helper / diagnostics: list part files for an upload session. */
export async function listChunkParts(id: string, userId: string) {
  const root = await incomingRoot();
  const paths = sessionPaths(root, id);
  await loadChunkUpload(id, userId);
  try {
    return await readdir(paths.parts);
  } catch {
    return [];
  }
}
