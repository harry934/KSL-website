import type { ModuleKey } from "@/lib/modules";
import { refreshNotices } from "@/lib/notification-seen";

export const BUSY_EVENT = "ksl-busy";
export type BusyDetail = { delta: 1 | -1; message?: string };

/** Shows the "Please wait" overlay and loading bar while `work` runs. */
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

/** Home-hero films go straight to storage. The admin request only asks for the address. */
async function uploadHeroVideo(module: ModuleKey, file: File) {
  const header = new Uint8Array(await file.slice(0, 256).arrayBuffer());
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-ksl-module": module,
      "x-ksl-hero": "1",
    },
    body: JSON.stringify({
      name: file.name,
      size: file.size,
      type: file.type,
      prefix: Array.from(header),
    }),
  });
  if (!res.ok) throw new Error(await uploadError(res));
  const data = await res.json();
  const typed = new File([file], file.name, { type: data.content_type || file.type || "video/mp4" });
  const body = new FormData();
  body.append("cacheControl", "31536000");
  body.append("", typed);
  const put = await fetch(data.signed_url, { method: "PUT", headers: { "x-upsert": "false" }, body });
  if (!put.ok) {
    const detail = await put.json().catch(() => ({}));
    const message = typeof detail.message === "string" ? detail.message : "";
    if (/mime/i.test(message)) throw new Error("That video type is not allowed. Use an MP4 or WebM file.");
    if (/size|large|exceed/i.test(message)) throw new Error("Video is too large (max 50 MB).");
    throw new Error("The video could not be saved. Please try again.");
  }
  return { public_url: data.public_url as string, storage_path: data.storage_path as string, preview_url: data.public_url as string };
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
    const res = await fetch("/api/upload", {
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
