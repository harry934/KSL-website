import assert from "node:assert/strict";
import test from "node:test";
import { toPublicCareersPayload } from "./careers.ts";
import { toPublicDownloadsPayload } from "./downloads.ts";
import { matchesDeclaredType, mp4IsHevc } from "./file-bytes.ts";
import { heroFrameOffset, parseHeroCrop, parseHeroTrim } from "./hero-frame.ts";
import { issueContactToken, verifyContactToken } from "./contact-token.ts";
import { looksLikeCode } from "./input-guard.ts";
import { IDLE_MS, judgeSession } from "./staff-session.ts";
import { sanitizeRichHtml } from "./sanitize-html.ts";
import { safeLink } from "./safe-link.ts";
import { verifyTurnstile } from "./contact-token.ts";
import { clientIp } from "./auth-server.ts";
import type { NextRequest } from "next/server";

test("published careers stay public and drafts stay out", () => {
  const payload = toPublicCareersPayload(
    { apply_email: "careers@kenyashipyards.co.ke", apply_note: "Send a CV." },
    [
      {
        id: "1",
        kind: "vacancy",
        title: "Fitter",
        location: "Mombasa",
        summary: "Published role",
        closing_date: "2026-12-01",
        apply_url: "https://example.com/apply",
        sort_order: 1,
        status: "published",
      },
      {
        id: "2",
        kind: "vacancy",
        title: "Hidden role",
        location: "Nairobi",
        summary: "Not public",
        closing_date: null,
        apply_url: null,
        sort_order: 2,
        status: "draft",
      },
    ]
  );
  assert.equal(payload.vacancies.length, 1);
  assert.equal(payload.vacancies[0].title, "Fitter");
  assert.equal(JSON.stringify(payload).includes("Hidden role"), false);
});

test("unpublished downloads are not signed or returned", () => {
  const payload = toPublicDownloadsPayload("https://example.com/files/", [
    {
      id: "pub",
      title: "Public file",
      subtitle: null,
      category: "reports",
      category_label: "Reports",
      language: null,
      doc_date: null,
      file_type: "pdf",
      file_name: "public.pdf",
      anchor: null,
      alias_of: null,
      external_href: null,
      source: "standard",
      sort_order: 1,
      status: "published",
    },
    {
      id: "draft",
      title: "Secret draft",
      subtitle: null,
      category: "reports",
      category_label: "Reports",
      language: null,
      doc_date: null,
      file_type: "pdf",
      file_name: null,
      anchor: null,
      alias_of: null,
      external_href: "private:downloads/secret.pdf",
      source: "storage",
      sort_order: 2,
      status: "draft",
    },
  ]);
  assert.equal(payload.items.length, 1);
  assert.equal(payload.items[0].title, "Public file");
  assert.equal(JSON.stringify(payload).includes("secret.pdf"), false);
});

test("story HTML drops scripts and unsafe links", () => {
  const clean = sanitizeRichHtml(
    '<p onclick="alert(1)">Hello</p><script>alert(1)</script><a href="javascript:alert(1)">bad</a><a href="https://example.com">ok</a>'
  );
  assert.equal(clean.includes("script"), false);
  assert.equal(clean.includes("javascript:"), false);
  assert.equal(clean.includes("onclick"), false);
  assert.equal(clean.includes("https://example.com"), true);
  assert.equal(clean.includes("Hello"), true);
});

test("file bytes must match the declared type", () => {
  assert.equal(matchesDeclaredType(Uint8Array.from([0xff, 0xd8, 0xff, 0x00]), "jpg"), true);
  assert.equal(matchesDeclaredType(Uint8Array.from([0x3c, 0x73, 0x63, 0x72]), "jpg"), false);
  assert.equal(matchesDeclaredType(Uint8Array.from([0x25, 0x50, 0x44, 0x46]), "pdf"), true);
  assert.equal(matchesDeclaredType(Uint8Array.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]), "mp4"), true);
  assert.equal(matchesDeclaredType(Uint8Array.from([0x00, 0x00, 0x00, 0x08, 0x66, 0x72, 0x65, 0x65, 0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]), "mp4"), true);
  assert.equal(matchesDeclaredType(Uint8Array.from([0x1a, 0x45, 0xdf, 0xa3]), "webm"), true);
  assert.equal(matchesDeclaredType(Uint8Array.from([0xff, 0xd8, 0xff, 0x00]), "mp4"), false);
  assert.equal(mp4IsHevc(Uint8Array.from([0x68, 0x76, 0x63, 0x31])), true);
  assert.equal(mp4IsHevc(Uint8Array.from([0x69, 0x73, 0x6f, 0x6d])), false);
});

test("a hero crop stays inside the film and covers the frame", () => {
  assert.equal(parseHeroCrop({ x: 0, y: 0, w: 1, h: 1 }), null);
  assert.deepEqual(parseHeroCrop({ x: -0.2, y: 0.1, w: 0.5, h: 0.4 }), { x: 0, y: 0.1, w: 0.5, h: 0.4 });
  const placed = heroFrameOffset(1600, 900, 1920, 1080, { x: 0, y: 0, w: 0.5, h: 1 });
  assert.ok(placed.width >= 1600);
  assert.ok(placed.height >= 900);
  assert.equal(Math.round(placed.left), 0);
});

test("a hero trim stays inside the film", () => {
  assert.equal(parseHeroTrim({ start: 0, end: 30 }, 30), null);
  assert.deepEqual(parseHeroTrim({ start: 1.24, end: 8.09 }, 30), { start: 1.2, end: 8.1 });
  assert.equal(parseHeroTrim({ start: 4, end: 4.1 }), null);
});

test("code-like text is blocked and ordinary messages are not", () => {
  assert.equal(looksLikeCode("Please tell me about dry dock dates."), false);
  assert.equal(looksLikeCode("A price under 2 million is fine."), false);
  assert.equal(looksLikeCode("<script>alert(1)</script>"), true);
  assert.equal(looksLikeCode("javascript:alert(1)"), true);
  assert.equal(looksLikeCode("&lt;iframe src=x&gt;"), true);
  assert.equal(looksLikeCode("hello onerror=alert(1)"), true);
});

test("a staff session stays open for one browser and 30 minutes of use", () => {
  const now = Date.parse("2026-10-23T10:00:00Z");
  assert.equal(judgeSession({ cookieKey: "abc", storedKey: "abc", seenAt: new Date(now - 60_000).toISOString(), now }), null);
  assert.equal(judgeSession({ cookieKey: "", storedKey: "abc", seenAt: new Date(now).toISOString(), now }), "missing");
  assert.equal(judgeSession({ cookieKey: "old", storedKey: "new", seenAt: new Date(now).toISOString(), now }), "elsewhere");
  assert.equal(
    judgeSession({ cookieKey: "abc", storedKey: "abc", seenAt: new Date(now - IDLE_MS - 1000).toISOString(), now }),
    "idle"
  );
});

test("contact tokens expire into use and reject tampering", () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
  const token = issueContactToken();
  assert.equal(verifyContactToken(token), "too_fast");
  assert.equal(verifyContactToken(token + "x"), "invalid");
  assert.equal(verifyContactToken("not-a-token"), "invalid");
});

test("safe links keep http(s)/mailto/tel and relative paths only", () => {
  assert.equal(safeLink("https://example.com/apply"), "https://example.com/apply");
  assert.equal(safeLink("mailto:careers@kenyashipyards.co.ke"), "mailto:careers@kenyashipyards.co.ke");
  assert.equal(safeLink("tel:+254700000000"), "tel:+254700000000");
  assert.equal(safeLink("about.html"), "about.html");
  assert.equal(safeLink("/careers.html"), "/careers.html");
  assert.equal(safeLink("#section"), "#section");
  assert.equal(safeLink("javascript:alert(1)"), null);
  assert.equal(safeLink("data:text/html,hi"), null);
  assert.equal(safeLink("//evil.example/path"), null);
  assert.equal(safeLink("about.html onclick=x"), null);
});

test("published careers drop unsafe apply links", () => {
  const payload = toPublicCareersPayload(null, [
    {
      id: "1",
      kind: "vacancy",
      title: "Bad link role",
      location: "Mombasa",
      summary: "Published",
      closing_date: null,
      apply_url: "javascript:alert(1)",
      sort_order: 1,
      status: "published",
    },
  ]);
  assert.equal(payload.vacancies[0].applyUrl, undefined);
});

test("Turnstile fails closed in production without a secret", async () => {
  const prevSecret = process.env.TURNSTILE_SECRET_KEY;
  const prevNode = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL_ENV;
  delete process.env.TURNSTILE_SECRET_KEY;
  process.env.NODE_ENV = "production";
  delete process.env.VERCEL_ENV;
  assert.equal(await verifyTurnstile("token", "1.2.3.4"), false);
  process.env.NODE_ENV = "development";
  assert.equal(await verifyTurnstile("token", "1.2.3.4"), true);
  if (prevSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
  else process.env.TURNSTILE_SECRET_KEY = prevSecret;
  if (prevNode === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = prevNode;
  if (prevVercel === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = prevVercel;
});

test("client IP prefers x-real-ip then the first forwarded hop", () => {
  const asReq = (headers: Record<string, string>) =>
    ({ headers: { get: (name: string) => headers[name.toLowerCase()] ?? null } }) as NextRequest;
  assert.equal(clientIp(asReq({ "x-real-ip": "10.0.0.1", "x-forwarded-for": "1.1.1.1, 2.2.2.2" })), "10.0.0.1");
  assert.equal(clientIp(asReq({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" })), "1.1.1.1");
  assert.equal(clientIp(asReq({})), "unknown");
});
