import type { ModuleKey } from "@/lib/modules";
import { refreshNotices } from "@/lib/notification-seen";
import { appPath } from "@/lib/base-path";

export const BUSY_EVENT = "ksl-busy";
export type BusyDetail = { delta: 1 | -1; message?: string };

/** Marks the portal busy for the thin top progress bar while `work` runs. Buttons should show their own Saving… / Deleting… label. */
export async function withBusy<T>(message: string, work: () => Promise<T>): Promise<T> {
  window.dispatchEvent(new CustomEvent<BusyDetail>(BUSY_EVENT, { detail: { delta: 1, message } }));
  try {
    return await work();
  } finally {
    window.dispatchEvent(new CustomEvent<BusyDetail>(BUSY_EVENT, { detail: { delta: -1 } }));
  }
}

async function readError(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (typeof data.error === "string" && data.error) return data.error;
  if (res.status === 413) return "That file is too large to send this way.";
  if (res.status === 404) return "Upload route missing. Rebuild/restart the portal on the server.";
  return `The upload did not work (${res.status}). Please try again.`;
}

function networkUploadError(err: unknown) {
  if (err instanceof DOMException && err.name === "AbortError") {
    return "The upload timed out. Try again, or use a smaller file.";
  }
  const message = err instanceof Error ? err.message : "";
  if (/failed to fetch|networkerror|load failed|connection/i.test(message)) {
    return "The upload was interrupted. Check your connection and try again.";
  }
  return message || "The upload did not work. Please try again.";
}

async function postJson(url: string, body: unknown, signal: AbortSignal) {
  const res = await fetch(appPath(url), {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.error === "string" && data.error ? data.error : await readError(res));
  return data;
}

export type UploadProgress = {
  percent: number;
  sentBytes: number;
  totalBytes: number;
};

/** Small files: one raw POST — fastest path. */
async function postFileDirect(
  module: ModuleKey,
  file: File,
  extraHeaders: Record<string, string> | undefined,
  signal: AbortSignal,
  onProgress?: (progress: UploadProgress) => void
) {
  onProgress?.({ percent: 5, sentBytes: 0, totalBytes: file.size });
  const res = await fetch(appPath("/api/upload"), {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/octet-stream",
      "x-ksl-module": module,
      "x-ksl-filename": encodeURIComponent(file.name),
      "x-ksl-content-type": file.type || "application/octet-stream",
      ...extraHeaders,
    },
    body: file,
  });
  if (!res.ok) throw new Error(await readError(res));
  const data = await res.json().catch(() => null);
  if (!data || typeof data.public_url !== "string") {
    throw new Error("The upload finished but the portal did not return a file link. Please try again.");
  }
  onProgress?.({ percent: 100, sentBytes: file.size, totalBytes: file.size });
  return data as { public_url: string; storage_path: string; preview_url?: string };
}

/**
 * Large files: raw binary chunks (no base64). Much faster than JSON encoding.
 * Falls back to base64 JSON chunks only if raw binary is rejected.
 */
async function postFileChunked(
  module: ModuleKey,
  file: File,
  extraHeaders: Record<string, string> | undefined,
  signal: AbortSignal,
  onProgress?: (progress: UploadProgress) => void
) {
  const report = (sentBytes: number) => {
    const totalBytes = file.size || 1;
    const percent = Math.max(0, Math.min(100, Math.round((sentBytes / totalBytes) * 100)));
    onProgress?.({ percent, sentBytes, totalBytes });
  };

  const heroVideo = extraHeaders?.["x-ksl-hero"] === "1";
  const galleryVideo = extraHeaders?.["x-ksl-gallery-video"] === "1";
  report(0);
  const init = await postJson(
    "/api/upload/init",
    {
      module,
      name: file.name,
      contentType: file.type || "application/octet-stream",
      size: file.size,
      heroVideo,
      galleryVideo,
    },
    signal
  );

  const uploadId = String(init.uploadId || "");
  const signature = String(init.signature || "");
  const chunkSize = Math.max(256 * 1024, Math.min(4 * 1024 * 1024, Number(init.chunkSize) || 4 * 1024 * 1024));
  if (!uploadId || !signature) throw new Error("The upload did not start correctly. Please try again.");

  let useBinary = init.mode !== "json";
  let offset = 0;
  while (offset < file.size) {
    const piece = file.slice(offset, offset + chunkSize);
    let received: number;

    if (useBinary) {
      const res = await fetch(appPath("/api/upload/chunk"), {
        method: "POST",
        signal,
        headers: {
          "Content-Type": "application/octet-stream",
          "x-ksl-module": module,
          "x-ksl-upload-id": uploadId,
          "x-ksl-upload-sig": signature,
          "x-ksl-offset": String(offset),
        },
        body: piece,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // One-time fallback if this VPS still rejects raw bodies.
        if (res.status === 400 && offset === 0) {
          useBinary = false;
          continue;
        }
        throw new Error(typeof data.error === "string" && data.error ? data.error : await readError(res));
      }
      received = Number(data.received);
    } else {
      const bytes = new Uint8Array(await piece.arrayBuffer());
      let binary = "";
      const step = 0x8000;
      for (let i = 0; i < bytes.length; i += step) {
        binary += String.fromCharCode(...bytes.subarray(i, i + step));
      }
      const data = await postJson(
        "/api/upload/chunk",
        {
          module,
          uploadId,
          signature,
          offset,
          data: btoa(binary),
        },
        signal
      );
      received = Number(data.received);
    }

    if (!Number.isFinite(received) || received <= offset) {
      throw new Error("The upload stalled. Please try again.");
    }
    offset = received;
    report(offset);
  }

  const finished = await postJson("/api/upload/finish", { module, uploadId, signature }, signal);
  if (!finished || typeof finished.public_url !== "string") {
    throw new Error("The upload finished but the portal did not return a file link. Please try again.");
  }
  report(file.size);
  return finished as { public_url: string; storage_path: string; preview_url?: string };
}

async function postFile(
  module: ModuleKey,
  file: File,
  extraHeaders?: Record<string, string>,
  onProgress?: (progress: UploadProgress) => void
) {
  const controller = new AbortController();
  const timeoutMs = Math.min(300_000, Math.max(60_000, Math.round(file.size / 128) + 60_000));
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Single request is much faster for small photos/docs.
    if (file.size > 0 && file.size <= 3 * 1024 * 1024) {
      return await postFileDirect(module, file, extraHeaders, controller.signal, onProgress);
    }
    return await postFileChunked(module, file, extraHeaders, controller.signal, onProgress);
  } catch (err) {
    throw new Error(networkUploadError(err));
  } finally {
    window.clearTimeout(timer);
  }
}

export async function uploadFile(
  module: ModuleKey,
  file: File,
  extraHeaders?: Record<string, string>,
  onProgress?: (progress: UploadProgress) => void
): Promise<{ public_url: string; storage_path: string; preview_url?: string }> {
  return withBusy("Uploading…", () => postFile(module, file, extraHeaders, onProgress));
}

const BUSY_WORDS: Record<string, string> = { DELETE: "Deleting…", GET: "" };

export const DRAFT_SAVED =
  "Saved as a draft. Someone who can publish will check it before it goes on the website.";

export function awaitingReview(data: unknown) {
  return Boolean(data && typeof data === "object" && ((data as { held?: boolean }).held || (data as { queued?: boolean }).queued));
}

/** POST/PATCH/DELETE JSON and turn any failure into a readable message. */
export async function sendJson(url: string, method: string, body?: unknown) {
  const run = async () => {
    const res = await fetch(appPath(url), {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message =
        typeof data.error === "string" && data.error
          ? data.error
          : `Something went wrong (${res.status}). Please try again.`;
      const requestId = typeof data.requestId === "string" && data.requestId ? ` [${data.requestId}]` : "";
      throw new Error(`${message}${requestId}`);
    }
    if (method.toUpperCase() !== "GET") refreshNotices();
    return data;
  };
  const message = BUSY_WORDS[method.toUpperCase()] ?? "Saving…";
  return message ? withBusy(message, run) : run();
}
