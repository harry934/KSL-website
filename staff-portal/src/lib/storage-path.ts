export type StorageObject = {
  bucket: "media-public" | "downloads" | "avatars";
  path: string;
};

const DOC_EXTS = new Set(["pdf", "doc", "docx"]);
const PREFIX =
  /^(news|gallery|events|services|products|projects|downloads|csr|press|careers|organization|site_settings|avatars)\//;

function safePath(path: string) {
  return path.length >= 8 && path.length <= 240 && !path.includes("..") && /^[\w./-]+$/.test(path);
}

/** A Supabase object behind a stored path or public URL. Website img/ files are left alone. */
export function storageObjectFrom(value: unknown): StorageObject | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw || raw.startsWith("img/") || raw.startsWith("/img/") || raw.includes("..")) return null;

  if (raw.startsWith("private:")) {
    const path = raw.slice("private:".length);
    return path.startsWith("downloads/") && safePath(path) ? { bucket: "downloads", path } : null;
  }

  if (/^https?:/i.test(raw)) {
    try {
      const url = new URL(raw);
      if (url.pathname === "/api/stored-file") {
        const bucket = url.searchParams.get("bucket");
        const path = url.searchParams.get("path") ?? "";
        if (
          (bucket === "media-public" || bucket === "downloads" || bucket === "avatars") &&
          safePath(path)
        ) {
          return { bucket, path };
        }
      }
      const pathname = decodeURIComponent(url.pathname);
      const match = pathname.match(
        /\/storage\/v1\/object\/(?:public|sign|authenticated)\/(media-public|downloads|avatars)\/(.+)$/
      );
      if (!match) return null;
      const path = match[2];
      const bucket = match[1] as StorageObject["bucket"];
      return safePath(path) ? { bucket, path } : null;
    } catch {
      return null;
    }
  }

  if (!safePath(raw) || !PREFIX.test(raw)) return null;
  const ext = raw.split(".").pop()?.toLowerCase() ?? "";
  const bucket: StorageObject["bucket"] = raw.startsWith("avatars/")
    ? "avatars"
    : DOC_EXTS.has(ext)
      ? "downloads"
      : "media-public";
  return { bucket, path: raw };
}
