import type { NextRequest } from "next/server";

/** Browser Origin, or the origin of Referer when Origin is absent. */
export function mutationRequestOrigin(request: NextRequest): string | null {
  const origin = request.headers.get("origin");
  if (origin) return origin;
  const referer = request.headers.get("referer");
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

/**
 * Origins that may send cookie-authenticated mutations.
 * Includes nextUrl, Host / X-Forwarded-* (Nginx), and configured site/portal URLs
 * so reverse-proxied deployments are not compared only to 127.0.0.1:3000.
 */
export function allowedMutationOrigins(request: NextRequest): Set<string> {
  const allowed = new Set<string>();
  allowed.add(request.nextUrl.origin);

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host")?.trim() || "";
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    request.nextUrl.protocol.replace(":", "") ||
    "http";
  if (host) allowed.add(`${proto}://${host}`);

  for (const raw of [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_PORTAL_URL,
    process.env.PUBLIC_SITE_ORIGIN,
  ]) {
    if (!raw) continue;
    for (const part of raw.split(",")) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      try {
        allowed.add(new URL(trimmed).origin);
      } catch {
        // ignore invalid env values
      }
    }
  }

  return allowed;
}

export function isAllowedMutationOrigin(request: NextRequest): boolean {
  const requestOrigin = mutationRequestOrigin(request);
  if (!requestOrigin) return false;
  return allowedMutationOrigins(request).has(requestOrigin);
}
