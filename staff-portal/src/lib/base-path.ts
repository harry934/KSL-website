/** App basePath from NEXT_PUBLIC_BASE_PATH (e.g. "/kwela"). Empty when serving at domain root. */
export function currentBasePath() {
  return (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
}

/** Snapshot at module load; prefer currentBasePath()/appPath() for fetches. */
export const basePath = currentBasePath();

/** Prefix a same-origin app path for fetch/navigation under basePath. */
export function appPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${currentBasePath()}${normalized}`;
}
