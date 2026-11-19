import { signedStoredFileUrl } from "@/lib/storage";
import { storedFileUrl } from "@/lib/storage";
import { storageObjectFrom } from "@/lib/storage-path";
import { safeLink } from "@/lib/safe-link";

const PREFIX = "private:";

export function privateRef(storagePath: string) {
  return PREFIX + storagePath;
}

export function isPrivateRef(value: string) {
  return value.startsWith(PREFIX);
}

export async function openStoredUrl(href: string, seconds = 3600) {
  const object = storageObjectFrom(href);
  if (!object) return safeLink(href) ?? "";
  if (object.bucket !== "downloads") return "";
  return signedStoredFileUrl(object.bucket, object.path, seconds);
}

function localizeStoredUrl(value: string) {
  const object = storageObjectFrom(value);
  if (!object) return value;
  return object.bucket === "media-public" ? storedFileUrl(object.bucket, object.path) : "";
}

export async function signPayload<T>(value: T): Promise<T> {
  if (typeof value === "string") {
    if (isPrivateRef(value)) return "" as T;
    // Re-localize every known storage object so legacy URLs that dropped /kwela
    // (or still point at :3000) are rewritten to the current portal address.
    const object = storageObjectFrom(value);
    if (object) return localizeStoredUrl(value) as T;
    if (value.includes("/storage/v1/object/")) {
      return value.replace(/https?:\/\/[^"' <>)\]]+/g, localizeStoredUrl) as T;
    }
    return value as T;
  }
  if (Array.isArray(value)) {
    return Promise.all(value.map((item) => signPayload(item))) as Promise<T>;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = await signPayload(item);
    }
    return out as T;
  }
  return value;
}
