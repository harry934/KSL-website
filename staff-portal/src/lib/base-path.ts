/** App basePath from NEXT_PUBLIC_BASE_PATH (e.g. "/admin"). Empty when serving at domain root. */
export const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");

/** Prefix a same-origin app path for fetch/navigation under basePath. */
export function appPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${basePath}${normalized}`;
}
