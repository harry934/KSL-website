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

async function uploadError(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (typeof data.error === "string" && data.error) return data.error;
  if (res.status === 413) return "That file is too large to send this way.";
  if (res.status === 0 || res.type === "error") {
    return "The upload was interrupted. Check your connection and try a smaller file.";
  }
  return "The upload did not work. Please try again.";
}

function networkUploadError(err: unknown) {
  const message = err instanceof Error ? err.message : "";
  if (/failed to fetch|networkerror|load failed|connection/i.test(message)) {
    return "The upload was interrupted. Check your connection and try again. Documents and videos can be up to 100 MB.";
  }
  return message || "The upload did not work. Please try again.";
}

/**
 * Send the file as a raw body. Multipart form-data through this VPS Nginx/Next path
 * resets the TCP connection (net::ERR_CONNECTION_RESET).
 */
async function postFile(module: ModuleKey, file: File, extraHeaders?: Record<string, string>) {
  let res: Response;
  try {
    res = await fetch(appPath("/api/upload"), {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "x-ksl-module": module,
        // Percent-encode so non-ASCII / spaces never break ByteString headers.
        "x-ksl-filename": encodeURIComponent(file.name),
        "x-ksl-content-type": file.type || "application/octet-stream",
        ...extraHeaders,
      },
      body: file,
    });
  } catch (err) {
    throw new Error(networkUploadError(err));
  }
  if (!res.ok) throw new Error(await uploadError(res));
  return res.json();
}

export async function uploadFile(
  module: ModuleKey,
  file: File,
  extraHeaders?: Record<string, string>
): Promise<{ public_url: string; storage_path: string; preview_url?: string }> {
  return withBusy("Uploading…", () => postFile(module, file, extraHeaders));
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
