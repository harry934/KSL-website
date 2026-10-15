export const PUBLIC_SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://ksl-website.vercel.app").replace(/\/$/, "");

/** Site images are stored as paths like img/ksl/x.jpg; the portal needs a full address to preview them. */
export function siteAssetUrl(path: string | null | undefined) {
  const value = (path ?? "").trim();
  if (!value) return "";
  if (/^(https?:)?\/\//i.test(value) || value.startsWith("data:") || value.startsWith("blob:")) return value;
  return `${PUBLIC_SITE_URL}/${value.replace(/^\/+/, "")}`;
}
