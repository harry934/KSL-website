import type { NextRequest } from "next/server";
import { currentBasePath } from "@/lib/base-path";

/** Public portal origin from env (e.g. http://178.162.219.218). */
export function configuredPortalOrigin(): string | null {
  const raw = (process.env.NEXT_PUBLIC_PORTAL_URL || "").trim();
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

/**
 * Absolute public URL for a portal path.
 * Prefer NEXT_PUBLIC_PORTAL_URL so redirects never leak http://localhost:3000
 * when Next sits behind Nginx on 127.0.0.1:3000.
 */
export function publicPortalUrl(path: string, request?: NextRequest): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const configured = (process.env.NEXT_PUBLIC_PORTAL_URL || "").trim().replace(/\/$/, "");
  if (configured) return `${configured}${normalized}`;

  const host =
    request?.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request?.headers.get("host")?.trim() ||
    request?.nextUrl.host ||
    "localhost:3000";
  const proto =
    request?.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    request?.nextUrl.protocol.replace(":", "") ||
    "http";
  const base = currentBasePath();
  return `${proto}://${host}${base}${normalized}`;
}
