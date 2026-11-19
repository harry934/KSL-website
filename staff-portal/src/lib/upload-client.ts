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
  return "The upload did not work. Please try again.";
}

/** Home-hero films use the same validated, server-side filesystem upload as other files. */
async function uploadHeroVideo(module: ModuleKey, file: File) {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch(appPath("/api/upload"), {
    method: "POST",
    headers: {
      "x-ksl-module": module,
      "x-ksl-hero": "1",
    },
    body,
  });
  if (!res.ok) throw new Error(await uploadError(res));
  return res.json();
}

export async function uploadFile(
  module: ModuleKey,
  file: File,
  extraHeaders?: Record<string, string>
): Promise<{ public_url: string; storage_path: string; preview_url?: string }> {
  return withBusy("Uploading…", async () => {
    if (extraHeaders?.["x-ksl-hero"] === "1") return uploadHeroVideo(module, file);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(appPath("/api/upload"), {
      method: "POST",
      headers: { "x-ksl-module": module, ...extraHeaders },
      body: fd,
    });
    if (!res.ok) throw new Error(await uploadError(res));
    return res.json();
  });
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
    const res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
    if (method.toUpperCase() !== "GET") refreshNotices();
    return data;
  };
  const message = BUSY_WORDS[method.toUpperCase()] ?? "Saving…";
  return message ? withBusy(message, run) : run();
}
