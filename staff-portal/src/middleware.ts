import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { STAFF_SESSION_COOKIE, judgeSession, sessionCookieOptions } from "@/lib/staff-session";
import { clearStaffSession, readStaffSession } from "@/lib/staff-session-server";

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
  "/api/auth/sign-in",
  "/api/auth/passkey",
  "/api/auth/forgot-password",
  "/api/auth/invite/verify",
  "/api/auth/invite/complete",
  "/api/auth/invite/username-check",
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
  if (pathname.startsWith("/api/public/")) {
    return publicApi(request);
  }
  if (pathname === "/login" && request.nextUrl.searchParams.has("reason")) {
    const url = request.nextUrl.clone();
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (PUBLIC_API_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });
  const issued: { name: string; value: string; options?: Parameters<NextResponse["cookies"]["set"]>[2] }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
            issued.push({ name, value, options });
          });
        },
      },
    }
  );

  function endBrowserSession(target: NextResponse) {
    issued.forEach(({ name, value, options }) => target.cookies.set(name, value, options));
    target.cookies.set(STAFF_SESSION_COOKIE, "", sessionCookieOptions(0));
    return target;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLogin = pathname === "/login";
  const isSignup = pathname === "/signup" || pathname.startsWith("/i/");
  const publicPage = isLogin || isSignup;
  const quietPath = pathname === "/api/auth/session" || pathname === "/api/auth/sign-out";

  if (!user && !publicPage) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && !quietPath) {
    const row = await readStaffSession(user.id).catch(() => null);
    const reason = !row || !row.active
      ? row && !row.active
        ? "suspended"
        : "missing"
      : judgeSession({
          cookieKey: request.cookies.get(STAFF_SESSION_COOKIE)?.value,
          storedKey: row.key,
          seenAt: row.seenAt,
          now: Date.now(),
        });

    if (reason) {
      // Idle sessions must leave the table so the staff list stops showing them as online.
      if (reason === "idle") {
        await clearStaffSession(user.id).catch(() => null);
      }
      await supabase.auth.signOut();
      if (pathname.startsWith("/api/")) {
        return endBrowserSession(NextResponse.json({ error: "Please sign in again." }, { status: 401 }));
      }
      if (publicPage) return endBrowserSession(response);
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      return endBrowserSession(NextResponse.redirect(url));
    }
  }

  if (user && publicPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|favicon.png|ksl-logo.png|brand/).*)"],
};
