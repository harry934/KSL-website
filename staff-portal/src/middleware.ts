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
  const headers = new Headers({ Vary: "Origin" });
  if (origin && isAllowedOrigin(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    headers.set("Access-Control-Max-Age", "86400");
  }
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers });
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405, headers });
  }
  const response = NextResponse.next();
  headers.forEach((value, key) => response.headers.set(key, value));
  return response;
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/public/")) {
    return publicApi(request);
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
  matcher: ["/api/public/:path*", "/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
