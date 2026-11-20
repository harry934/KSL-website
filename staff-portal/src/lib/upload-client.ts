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

export class UploadCancelledError extends Error {
  constructor(message = "Upload cancelled.") {
    super(message);
    this.name = "UploadCancelledError";
  }
}

function networkUploadError(err: unknown) {
  if (err instanceof UploadCancelledError) return err.message;
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

type XhrJsonResult = { ok: boolean; status: number; data: Record<string, unknown> };

/**
 * Binary POST with real upload byte progress. Fetch cannot report mid-body progress,
 * which made large video uploads look stuck at 0% for minutes.
 */
function postBinaryWithProgress(
  url: string,
  headers: Record<string, string>,
  body: Blob,
  signal: AbortSignal,
  onUploadProgress?: (loaded: number, total: number) => void
): Promise<XhrJsonResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value);
    }

    const failAbort = () => {
      xhr.abort();
      reject(new DOMException("The upload timed out.", "AbortError"));
    };

    if (signal.aborted) {
      failAbort();
      return;
    }
    signal.addEventListener("abort", failAbort, { once: true });

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onUploadProgress?.(event.loaded, event.total);
    };

    xhr.onload = () => {
      signal.removeEventListener("abort", failAbort);
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(xhr.responseText || "{}") as Record<string, unknown>;
      } catch {
        data = {};
      }
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, data });
    };

    xhr.onerror = () => {
      signal.removeEventListener("abort", failAbort);
      reject(new TypeError("Failed to fetch"));
    };

    xhr.ontimeout = failAbort;
    xhr.send(body);
  });
}

function linkSignals(parent: AbortSignal, child: AbortController) {
  if (parent.aborted) {
    child.abort();
    return () => undefined;
  }
  const onAbort = () => child.abort();
  parent.addEventListener("abort", onAbort);
  return () => parent.removeEventListener("abort", onAbort);
}

/** Small files: one raw POST — fastest path. */
async function postFileDirect(
  module: ModuleKey,
  file: File,
  extraHeaders: Record<string, string> | undefined,
  signal: AbortSignal,
  onProgress?: (progress: UploadProgress) => void
) {
  const totalBytes = file.size || 1;
  const report = (sentBytes: number) => {
    const percent = Math.max(0, Math.min(100, Math.round((sentBytes / totalBytes) * 100)));
    onProgress?.({ percent, sentBytes, totalBytes });
  };

  report(0);
  const result = await postBinaryWithProgress(
    appPath("/api/upload"),
    {
      "Content-Type": "application/octet-stream",
      "x-ksl-module": module,
      "x-ksl-filename": encodeURIComponent(file.name),
      "x-ksl-content-type": file.type || "application/octet-stream",
      ...extraHeaders,
    },
    file,
    signal,
    (loaded) => report(loaded)
  );

  if (!result.ok) {
    const message =
      typeof result.data.error === "string" && result.data.error
        ? result.data.error
        : result.status === 413
          ? "That file is too large to send this way."
          : `The upload did not work (${result.status}). Please try again.`;
    throw new Error(message);
  }

  const publicUrl = result.data.public_url;
  const storagePath = result.data.storage_path;
  if (typeof publicUrl !== "string" || typeof storagePath !== "string") {
    throw new Error("The upload finished but the portal did not return a file link. Please try again.");
  }
  report(file.size);
  return {
    public_url: publicUrl,
    storage_path: storagePath,
    preview_url: typeof result.data.preview_url === "string" ? result.data.preview_url : undefined,
  };
}

async function sendBinaryChunk(
  module: ModuleKey,
  uploadId: string,
  signature: string,
  offset: number,
  piece: Blob,
  parentSignal: AbortSignal,
  onBytes: (loadedInChunk: number) => void
) {
  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const chunkController = new AbortController();
    const unlink = linkSignals(parentSignal, chunkController);
    const chunkTimer = window.setTimeout(() => chunkController.abort(), 180_000);

    try {
      const result = await postBinaryWithProgress(
        appPath("/api/upload/chunk"),
        {
          "Content-Type": "application/octet-stream",
          "x-ksl-module": module,
          "x-ksl-upload-id": uploadId,
          "x-ksl-upload-sig": signature,
          "x-ksl-offset": String(offset),
        },
        piece,
        chunkController.signal,
        (loaded) => onBytes(loaded)
      );

      if (!result.ok) {
        const message =
          typeof result.data.error === "string" && result.data.error
            ? result.data.error
            : `The upload did not work (${result.status}). Please try again.`;
        if (result.status === 400 && offset === 0) {
          const err = new Error(message) as Error & { binaryRejected?: boolean };
          err.binaryRejected = true;
          throw err;
        }
        throw new Error(message);
      }

      return { chunkBytes: piece.size };
    } catch (err) {
      lastError = err;
      if (parentSignal.aborted) throw err;
      if ((err as { binaryRejected?: boolean }).binaryRejected) throw err;
      if (attempt >= maxAttempts) break;
      await new Promise((r) => window.setTimeout(r, 750 * attempt));
    } finally {
      window.clearTimeout(chunkTimer);
      unlink();
    }
  }

  throw lastError instanceof Error ? lastError : new Error("The upload stalled. Please try again.");
}

/**
 * Large files: raw binary chunks in parallel (no base64).
 * Falls back to sequential base64 JSON chunks only if raw binary is rejected.
 */
async function postFileChunked(
  module: ModuleKey,
  file: File,
  extraHeaders: Record<string, string> | undefined,
  signal: AbortSignal,
  onProgress?: (progress: UploadProgress) => void
) {
  const totalBytes = file.size || 1;
  const report = (sentBytes: number) => {
    const percent = Math.max(0, Math.min(100, Math.round((sentBytes / totalBytes) * 100)));
    onProgress?.({ percent, sentBytes: Math.min(sentBytes, totalBytes), totalBytes });
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
  const requested = Number(init.chunkSize) || 4 * 1024 * 1024;
  const chunkSize = Math.max(512 * 1024, Math.min(4 * 1024 * 1024, requested));
  const concurrency = Math.max(1, Math.min(4, Number(init.concurrency) || (heroVideo || galleryVideo ? 3 : 2)));
  if (!uploadId || !signature) throw new Error("The upload did not start correctly. Please try again.");

  const offsets: number[] = [];
  for (let offset = 0; offset < file.size; offset += chunkSize) offsets.push(offset);

  let useBinary = init.mode !== "json";
  if (useBinary) {
    const confirmed = new Map<number, number>();
    const inFlight = new Map<number, number>();
    const summarize = () => {
      let done = 0;
      for (const bytes of confirmed.values()) done += bytes;
      let flying = 0;
      for (const bytes of inFlight.values()) flying += bytes;
      report(done + flying);
    };

    let nextIndex = 0;
    let binaryRejected = false;
    let workerError: unknown;

    async function worker() {
      while (nextIndex < offsets.length) {
        if (signal.aborted) throw new DOMException("The upload timed out.", "AbortError");
        if (binaryRejected || workerError) return;
        const index = nextIndex++;
        const offset = offsets[index];
        const piece = file.slice(offset, offset + chunkSize);
        inFlight.set(offset, 0);
        try {
          const result = await sendBinaryChunk(
            module,
            uploadId,
            signature,
            offset,
            piece,
            signal,
            (loadedInChunk) => {
              inFlight.set(offset, loadedInChunk);
              summarize();
            }
          );
          confirmed.set(offset, result.chunkBytes);
          inFlight.delete(offset);
          summarize();
        } catch (err) {
          inFlight.delete(offset);
          if ((err as { binaryRejected?: boolean }).binaryRejected && offset === 0) {
            binaryRejected = true;
            return;
          }
          workerError = err;
          throw err;
        }
      }
    }

    try {
      await Promise.all(Array.from({ length: Math.min(concurrency, offsets.length) }, () => worker()));
    } catch (err) {
      if (!binaryRejected) throw err;
    }
    if (workerError && !binaryRejected) throw workerError;

    if (!binaryRejected) {
      const finished = await postJson("/api/upload/finish", { module, uploadId, signature }, signal);
      if (!finished || typeof finished.public_url !== "string") {
        throw new Error("The upload finished but the portal did not return a file link. Please try again.");
      }
      report(file.size);
      return finished as { public_url: string; storage_path: string; preview_url?: string };
    }
    useBinary = false;
  }

  // Sequential JSON fallback (older servers / rare binary rejection).
  let offset = 0;
  while (offset < file.size) {
    const piece = file.slice(offset, offset + Math.min(chunkSize, 1024 * 1024));
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
    const received = Number(data.received);
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
  onProgress?: (progress: UploadProgress) => void,
  externalSignal?: AbortSignal
) {
  const controller = new AbortController();
  const unlinkExternal = externalSignal ? linkSignals(externalSignal, controller) : () => undefined;
  const timeoutMs = Math.min(1_200_000, Math.max(120_000, Math.round(file.size / 16) + 120_000));
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    if (file.size > 0 && file.size <= 3 * 1024 * 1024) {
      return await postFileDirect(module, file, extraHeaders, controller.signal, onProgress);
    }
    return await postFileChunked(module, file, extraHeaders, controller.signal, onProgress);
  } catch (err) {
    if (externalSignal?.aborted) throw new UploadCancelledError();
    throw new Error(networkUploadError(err));
  } finally {
    window.clearTimeout(timer);
    unlinkExternal();
  }
}

export async function uploadFile(
  module: ModuleKey,
  file: File,
  extraHeaders?: Record<string, string>,
  onProgress?: (progress: UploadProgress) => void,
  signal?: AbortSignal
): Promise<{ public_url: string; storage_path: string; preview_url?: string }> {
  return withBusy("Uploading…", () => postFile(module, file, extraHeaders, onProgress, signal));
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
