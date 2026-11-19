function allowedHttpHosts() {
  const hosts = new Set<string>();
  for (const raw of [
    process.env.NEXT_PUBLIC_PORTAL_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.PUBLIC_SITE_ORIGIN,
  ]) {
    const value = raw?.trim();
    if (!value) continue;
    try {
      hosts.add(new URL(value).host.toLowerCase());
    } catch {
      /* ignore invalid origin */
    }
  }
  if (process.env.NODE_ENV !== "production") {
    hosts.add("localhost");
    hosts.add("127.0.0.1");
  }
  return hosts;
}

function extensionInStoredFilePath(value: string) {
  try {
    const url = new URL(value);
    if (!url.pathname.includes("/api/stored-file")) return null;
    const path = url.searchParams.get("path") || "";
    const match = /\.([a-z0-9]+)$/i.exec(path);
    return match ? match[1].toLowerCase() : null;
  } catch {
    return null;
  }
}

export function isImagePath(value: string) {
  if (/\.(jpe?g|png|webp)(\?|#|$)/i.test(value)) return true;
  const ext = extensionInStoredFilePath(value);
  return ext === "jpg" || ext === "jpeg" || ext === "png" || ext === "webp";
}

export function isVideoPath(value: string) {
  if (/\.(mp4|webm)(\?|#|$)/i.test(value)) return true;
  const ext = extensionInStoredFilePath(value);
  return ext === "mp4" || ext === "webm";
}

/** Accept https always; http only for configured site/portal hosts; relative img/ and storage paths. */
export function safeImageUrl(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes("..")) return null;

  if (/^(?:\/)?img\//i.test(trimmed)) {
    const normalized = trimmed.replace(/^\//, "");
    if (isImagePath(normalized) || isVideoPath(normalized)) return normalized;
    return null;
  }

  if (
    /^(news|gallery|events|services|products|projects|downloads|csr|press|careers|organization|site_settings|avatars)\//.test(
      trimmed,
    ) &&
    (isImagePath(trimmed) || isVideoPath(trimmed))
  ) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol === "https:") return url.toString();
    if (url.protocol === "http:" && allowedHttpHosts().has(url.host.toLowerCase())) {
      return url.toString();
    }
    return null;
  } catch {
    return null;
  }
}
