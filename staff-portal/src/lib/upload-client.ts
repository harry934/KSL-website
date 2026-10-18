import type { ModuleKey } from "@/lib/modules";

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

export async function uploadFile(
  module: ModuleKey,
  file: File
): Promise<{ public_url: string; storage_path: string; preview_url?: string }> {
  const fd = new FormData();
  fd.append("file", file);
  return withBusy("Uploading…", async () => {
    const res = await fetch("/api/upload", { method: "POST", headers: { "x-ksl-module": module }, body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "The upload did not work. Please try again.");
    return data;
  });
}

const BUSY_WORDS: Record<string, string> = { DELETE: "Deleting…", GET: "" };

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
    return data;
  };
  const message = BUSY_WORDS[method.toUpperCase()] ?? "Saving…";
  return message ? withBusy(message, run) : run();
}
