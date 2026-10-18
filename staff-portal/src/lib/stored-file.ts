import type { SupabaseClient } from "@supabase/supabase-js";

const PREFIX = "private:";

export function privateRef(storagePath: string) {
  return PREFIX + storagePath;
}

export function isPrivateRef(value: string) {
  return value.startsWith(PREFIX);
}

export async function openStoredUrl(admin: SupabaseClient, href: string, seconds = 3600) {
  if (!isPrivateRef(href)) return href;
  const path = href.slice(PREFIX.length);
  if (!path || path.includes("..") || !/^[\w./-]+$/.test(path)) return "";
  const { data } = await admin.storage.from("downloads").createSignedUrl(path, seconds);
  return data?.signedUrl ?? "";
}

export async function signPayload<T>(admin: SupabaseClient, value: T): Promise<T> {
  if (typeof value === "string") {
    return (isPrivateRef(value) ? await openStoredUrl(admin, value) : value) as T;
  }
  if (Array.isArray(value)) {
    return Promise.all(value.map((item) => signPayload(admin, item))) as Promise<T>;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = await signPayload(admin, item);
    }
    return out as T;
  }
  return value;
}
