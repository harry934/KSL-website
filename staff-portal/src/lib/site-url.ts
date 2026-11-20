const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
if (process.env.NODE_ENV === "production" && !configuredSiteUrl) {
  throw new Error("NEXT_PUBLIC_SITE_URL is required in production");
}

export const PUBLIC_SITE_URL = (configuredSiteUrl || "http://localhost:3000").replace(/\/$/, "");

const PORTAL_ORIGIN = (process.env.NEXT_PUBLIC_PORTAL_URL || "").trim().replace(/\/$/, "");

/** Site images are stored as paths like img/ksl/x.jpg; the portal needs a full address to preview them. */
export function siteAssetUrl(path: string | null | undefined) {
  const value = (path ?? "").trim();
  if (!value) return "";
  if (/^(https?:)?\/\//i.test(value) || value.startsWith("data:") || value.startsWith("blob:")) return value;
  // Uploaded media is served from the portal stored-file route, not the public site root.
  if (/\/api\/stored-file(\?|$)/i.test(value) || value.startsWith("api/stored-file")) {
    const relative = value.replace(/^\//, "");
    if (PORTAL_ORIGIN) return `${PORTAL_ORIGIN}/${relative}`;
    if (typeof window !== "undefined") return `${window.location.origin}/${relative}`;
  }
  if (
    /^(news|gallery|events|services|products|projects|downloads|csr|press|careers|organization|site_settings)\//.test(
      value,
    )
  ) {
    const query = new URLSearchParams({ bucket: "media-public", path: value });
    if (PORTAL_ORIGIN) return `${PORTAL_ORIGIN}/api/stored-file?${query}`;
    if (typeof window !== "undefined") return `${window.location.origin}/api/stored-file?${query}`;
  }
  return `${PUBLIC_SITE_URL}/${value.replace(/^\/+/, "")}`;
}
