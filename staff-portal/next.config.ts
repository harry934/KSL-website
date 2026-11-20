import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const siteOrigin = (process.env.PUBLIC_SITE_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || "").trim();
/** HTTP IP staging must allow http: media; HTTPS production stays https-only beyond 'self'. */
const allowHttpMedia = !siteOrigin.startsWith("https://");

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https:${allowHttpMedia ? " http:" : ""}`,
  `media-src 'self' blob: https:${allowHttpMedia ? " http:" : ""}`,
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Only send HSTS once the public site is HTTPS; HTTP IP staging must not pin HTTPS.
  ...(siteOrigin.startsWith("https://")
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

/** Set NEXT_PUBLIC_BASE_PATH=/kwela when Nginx proxies the portal on port 80/443 (no open :3000). */
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").trim().replace(/\/$/, "") || undefined;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // VPS production installs often omit devDependencies; typecheck still runs in `next build`.
  eslint: { ignoreDuringBuilds: true },
  ...(basePath ? { basePath } : {}),
  experimental: {
    // Default is 10MB. App allows uploads up to 100MB; without this, larger bodies
    // reset the TCP connection and the browser shows "Failed to fetch".
    middlewareClientMaxBodySize: "100mb",
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
