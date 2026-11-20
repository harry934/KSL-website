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

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return btoa(binary);
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

/**
 * Upload in small base64 JSON chunks so large brochures work reliably behind Nginx/Next.
 */
async function postFile(
  module: ModuleKey,
  file: File,
  extraHeaders?: Record<string, string>,
  onProgress?: (progress: UploadProgress) => void
) {
  const controller = new AbortController();
  const timeoutMs = Math.min(300_000, Math.max(90_000, Math.round(file.size / 256) + 90_000));
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  const report = (sentBytes: number) => {
    const totalBytes = file.size || 1;
    const percent = Math.max(0, Math.min(100, Math.round((sentBytes / totalBytes) * 100)));
    onProgress?.({ percent, sentBytes, totalBytes });
  };

  try {
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
      controller.signal
    );

    const uploadId = String(init.uploadId || "");
    const signature = String(init.signature || "");
    const chunkSize = Math.max(64 * 1024, Math.min(512 * 1024, Number(init.chunkSize) || 512 * 1024));
    if (!uploadId || !signature) throw new Error("The upload did not start correctly. Please try again.");

    let offset = 0;
    while (offset < file.size) {
      const piece = file.slice(offset, offset + chunkSize);
      const bytes = new Uint8Array(await piece.arrayBuffer());
      const data = await postJson(
        "/api/upload/chunk",
        {
          module,
          uploadId,
          signature,
          offset,
          data: bytesToBase64(bytes),
        },
        controller.signal
      );
      const received = Number(data.received);
      if (!Number.isFinite(received) || received <= offset) {
        throw new Error("The upload stalled. Please try again.");
      }
      offset = received;
      report(offset);
    }

    const finished = await postJson(
      "/api/upload/finish",
      { module, uploadId, signature },
      controller.signal
    );
    if (!finished || typeof finished.public_url !== "string") {
      throw new Error("The upload finished but the portal did not return a file link. Please try again.");
    }
    report(file.size);
    return finished as { public_url: string; storage_path: string; preview_url?: string };
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
