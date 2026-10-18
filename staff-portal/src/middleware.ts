import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ALLOWED_ORIGINS = new Set([
  "https://ksl-website.vercel.app",
  "https://kenyashipyards.co.ke",
  "https://www.kenyashipyards.co.ke",
]);

function isAllowedOrigin(origin: string) {
  return (
    ALLOWED_ORIGINS.has(origin) ||
    /^https:\/\/ksl-website-[a-z0-9-]+\.vercel\.app$/.test(origin) ||
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  );
}

function publicApi(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";
  const contactPost = request.nextUrl.pathname === "/api/public/contact";
  const headers = new Headers({ Vary: "Origin" });
  if (origin && isAllowedOrigin(origin)) {
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
  if (pathname === "/api/auth/sign-in") {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

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
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLogin = request.nextUrl.pathname === "/login";

  if (!user && !isLogin) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|favicon.png).*)"],
};
