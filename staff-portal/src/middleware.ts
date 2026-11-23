import { NextResponse, type NextRequest } from "next/server";
import { isAllowedMutationOrigin } from "@/lib/request-origin";
import { publicPortalUrl } from "@/lib/public-url";
import { STAFF_SESSION_COOKIE } from "@/lib/staff-session";

const ALLOWED_ORIGINS = new Set([
  "https://ksl-website.vercel.app",
  "https://kenyashipyards.co.ke",
  "https://www.kenyashipyards.co.ke",
]);

/** Extra public-site origins from the VPS env file, comma-separated, no trailing slash. */
function configuredOrigins() {
  return (process.env.PUBLIC_SITE_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

/** Unauthenticated API routes that skip the staff session gate. `/api/public/*` is handled separately. */
const PUBLIC_API_PATHS = new Set([
  "/api/health",
  "/api/auth/sign-in",
  "/api/auth/passkey",
  "/api/auth/mfa",
  "/api/auth/session",
  "/api/auth/pulse",
  "/api/auth/sign-out",
  "/api/auth/forgot-password",
  "/api/auth/invite/verify",
  "/api/auth/invite/complete",
  "/api/auth/invite/username-check",
  // Public media (and signed private downloads) — route still enforces bucket/signature rules.
  "/api/stored-file",
]);

function isAllowedOrigin(origin: string) {
  return (
    ALLOWED_ORIGINS.has(origin) ||
    configuredOrigins().includes(origin) ||
    /^https:\/\/ksl-website-[a-z0-9-]+\.vercel\.app$/.test(origin) ||
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  );
}

function publicApi(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";
  const contactPost = request.nextUrl.pathname === "/api/public/contact";
  const maintenanceGet = request.nextUrl.pathname === "/api/public/maintenance";
  const headers = new Headers({ Vary: "Origin" });
  if (origin && (isAllowedOrigin(origin) || maintenanceGet)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", contactPost ? "POST, OPTIONS" : "GET, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
    headers.set("Access-Control-Max-Age", "86400");
  }
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers });
  }
  if (contactPost && request.method === "POST") {
    const response = NextResponse.next();
    headers.forEach((value, key) => response.headers.set(key, value));
    return response;
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405, headers });
  }
  const response = NextResponse.next();
  headers.forEach((value, key) => response.headers.set(key, value));
  return response;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  // Uploads must not be touched by middleware body cloning / origin gates.
  if (pathname.startsWith("/api/upload") || pathname.startsWith("/api/account/avatar")) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/public/")) {
    return publicApi(request);
  }
  const hasSessionCookie = Boolean(request.cookies.get(STAFF_SESSION_COOKIE)?.value);
  const isMutation = !["GET", "HEAD", "OPTIONS"].includes(request.method);
  // Cookie-authenticated POSTs must come from the public site/portal origin.
  // Compare against Host / X-Forwarded-* and env URLs — not only nextUrl.origin,
  // which is often http://127.0.0.1:3000 behind Nginx.
  if (hasSessionCookie && isMutation && !isAllowedMutationOrigin(request)) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }
  if (pathname === "/login" && request.nextUrl.searchParams.has("reason")) {
    return NextResponse.redirect(publicPortalUrl("/login", request));
  }
  if (PUBLIC_API_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const isLogin = pathname === "/login";
  const isSignup = pathname === "/signup" || pathname.startsWith("/i/");
  const publicPage = isLogin || isSignup;
  if (!hasSessionCookie && !publicPage) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    }
    // Never redirect to http://localhost:3000 behind Nginx — use the public portal URL.
    return NextResponse.redirect(publicPortalUrl("/login", request));
  }

  const response = NextResponse.next({ request: { headers: request.headers } });
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  // Keep raw file uploads out of middleware so large bodies are not touched before the route.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon.png|ksl-logo.png|default-avatar.webp|brand/|api/upload|api/account/avatar).*)",
  ],
};
