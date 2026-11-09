import assert from "node:assert/strict";
import test from "node:test";
import { toPublicCareersPayload } from "./careers.ts";
import { toPublicDownloadsPayload } from "./downloads.ts";
import { matchesDeclaredType, mp4IsHevc } from "./file-bytes.ts";
import { heroFrameOffset, parseHeroCrop, parseHeroTrim } from "./hero-frame.ts";
import { issueContactToken, verifyContactToken } from "./contact-token.ts";
import { looksLikeCode } from "./input-guard.ts";
import { IDLE_MS, judgeSession, sessionIsLive } from "./staff-session.ts";
import { sanitizeRichHtml } from "./sanitize-html.ts";
import { cleanBoardSections, cleanIntro, cleanMilestoneInput, cleanOrgChart, parseMilestoneWhen, toPublicOrganization, type MilestoneRow } from "./organization.ts";
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

test("organisation chart keeps page order and drops unsafe text", () => {
  const chart = cleanOrgChart({
    boardCaption: "Governance",
    boardTitle: "Board <script>",
    executiveCaption: "Executive leadership",
    executiveTitle: "Managing Director",
    departments: [
      { id: "dept-02", title: "Production", units: ["Yard Management Division", ""] },
      { id: "bad id", title: "Legal", units: ["Compliance"] },
    ],
  });
  assert.equal(chart.boardTitle, "Board <script>");
  assert.equal(chart.departments[0].id, "dept-02");
  assert.deepEqual(chart.departments[0].units, ["Yard Management Division"]);
  assert.equal(chart.departments[1].id, "dept-2");
  assert.equal(chart.departments[0].office, false);
  assert.equal(cleanOrgChart({ departments: [{ id: "planning", title: "Corporate Planning", office: true, units: [] }] }).departments[0].office, true);
  const intro = cleanIntro({ intro_kicker: "Governance and operations", intro_title: "How it is structured", intro_body: "The Board leads." });
  const payload = toPublicOrganization(
    { chart_download_id: "plan", ...intro, intro_kicker: intro.kicker, intro_title: intro.title, intro_body: intro.body, chart },
    [],
    []
  );
  assert.equal(payload.intro.title, "How it is structured");
  assert.equal(payload.chart?.departments[0].title, "Production");
  const sections = cleanBoardSections([
    { id: "strategy", title: "Strategy", blurb: "Direction" },
    { id: "bad id", title: "People", blurb: "" },
    { id: "strategy", title: "Duplicate", blurb: "" },
  ]);
  assert.equal(sections[0].id, "strategy");
  assert.equal(sections[1].id, "section-2");
  assert.equal(sections[1].title, "People");
  assert.equal(cleanBoardSections([])[0].title, "Leadership");
  const hidden = cleanBoardSections([{ id: "audit", title: "Audit", blurb: "Finance", showTitle: false, showBlurb: false }]);
  assert.equal(hidden[0].title, "Audit");
  assert.equal(hidden[0].showTitle, false);
  assert.equal(hidden[0].showBlurb, false);
  const untitled = cleanBoardSections([{ id: "audit", name: "Audit", title: "", blurb: "" }]);
  assert.equal(untitled[0].name, "Audit");
  assert.equal(untitled[0].title, "");
  assert.equal(untitled[0].showTitle, false);
  const created = cleanBoardSections([{ id: "section-new", title: "", blurb: "" }]);
  assert.equal(created[0].name, "Section 1");
  assert.equal(created[0].title, "");
  const cleaned = cleanMilestoneInput({
    happened_on: "2022-08-02T00:00:00.000Z",
    title: "Uhuru II floats",
    summary: "The hull meets the water.",
    image_url: "javascript:alert(1)",
    image_slot: "about.13-mv-uhuru-ii-programme",
    story_key: "Uhuru II",
    tag_label: "MV Uhuru II, part 2 of 2",
    tag_note: "14 months from keel to water",
  });
  assert.equal(cleaned.happened_on, "2022-08-02");
  assert.equal(cleaned.date_precision, "day");
  assert.equal(parseMilestoneWhen("2018").happened_on, "2018-01-01");
  assert.equal(parseMilestoneWhen("2018").date_precision, "year");
  assert.equal(parseMilestoneWhen("2018-07").date_precision, "month");
  assert.equal(parseMilestoneWhen("").happened_on, null);
  assert.equal(cleaned.image_url, null);
  assert.equal(cleaned.image_slot, null);
  assert.equal(cleaned.story_key, "uhuru-ii");
  const keptImage = cleanMilestoneInput({
    happened_on: "2018-07-12",
    title: "Mombasa yard begins",
    summary: "The slipway site.",
    image_url: "img/ksl/mombasa.webp",
    image_slot: "about.7-mombasa-shipyard-aerial-view",
    story_key: "",
  });
  assert.equal(keptImage.image_url, "img/ksl/mombasa.webp");
  assert.equal(keptImage.image_slot, "about.7-mombasa-shipyard-aerial-view");
  const rows: MilestoneRow[] = [
    { id: "b", happened_on: "2020-09-29", date_precision: "day", title: "Later", summary: "Second", image_url: "img/ksl/yard.jpg", image_alt: "Yard", image_slot: null, story_key: null, tag_label: "Keep off the page", tag_note: "Hidden", sort_order: 1, status: "published" },
    { id: "a", happened_on: "2018-07-12", date_precision: "day", title: "First", summary: "Draft", image_url: "img/ksl/mombasa.webp", image_alt: "Yard", image_slot: "about.7-mombasa-shipyard-aerial-view", story_key: null, tag_label: null, tag_note: null, sort_order: 0, status: "draft" },
    { id: "c", happened_on: "2018-02-31", date_precision: "day", title: "Bad date", summary: "Skip", image_url: "img/ksl/mombasa.webp", image_alt: null, image_slot: null, story_key: null, tag_label: null, tag_note: null, sort_order: 2, status: "published" },
    { id: "d", happened_on: "2016-01-01", date_precision: "year", title: "", summary: null, image_url: null, image_alt: null, image_slot: null, story_key: null, tag_label: null, tag_note: null, sort_order: 3, status: "published" },
  ];
  const published = toPublicOrganization({ milestones_title: "Major Milestones", milestones_lead: "From the first yard." }, [], [], rows);
  assert.equal(published.milestonesTitle, "Major Milestones");
  assert.equal(published.milestones.length, 2);
  assert.equal(published.milestones[0].title, "Later");
  assert.equal(published.milestones[0].date, "2020-09-29");
  assert.equal(published.milestones[0].tag, "");
  assert.equal(published.milestones[1].date, "2016");
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

test("a staff session stays open for one browser and 20 minutes of use", () => {
  const now = Date.parse("2026-10-23T10:00:00Z");
  assert.equal(IDLE_MS, 20 * 60 * 1000);
  assert.equal(judgeSession({ cookieKey: "abc", storedKey: "abc", seenAt: new Date(now - 60_000).toISOString(), now }), null);
  assert.equal(judgeSession({ cookieKey: "", storedKey: "abc", seenAt: new Date(now).toISOString(), now }), "missing");
  assert.equal(judgeSession({ cookieKey: "old", storedKey: "new", seenAt: new Date(now).toISOString(), now }), "elsewhere");
  assert.equal(
    judgeSession({ cookieKey: "abc", storedKey: "abc", seenAt: new Date(now - IDLE_MS - 1000).toISOString(), now }),
    "idle"
  );
  assert.equal(sessionIsLive(new Date(now - 60_000).toISOString(), now), true);
  assert.equal(sessionIsLive(new Date(now - IDLE_MS - 1000).toISOString(), now), false);
  assert.equal(sessionIsLive(null, now), false);
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

test("published press drops unsafe asset links and bad contact emails", async () => {
  const { toPublicPress } = await import("./press.ts");
  const payload = toPublicPress(
    {
      boilerplate: "About KSL",
      contact_email: 'bad"><script>@evil.test',
      contact_phone: "0700",
    },
    [
      {
        id: "1",
        title: "Logo",
        href: "javascript:alert(1)",
        download_id: null,
        asset_type: "png",
        sort_order: 1,
        status: "published",
      },
      {
        id: "2",
        title: "Safe",
        href: "https://example.com/logo.png",
        download_id: null,
        asset_type: "png",
        sort_order: 2,
        status: "published",
      },
    ]
  );
  assert.equal(payload.contactEmail, "");
  assert.equal(payload.assets[0].href, undefined);
  assert.equal(payload.assets[1].href, "https://example.com/logo.png");
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

test("client IP prefers Vercel and x-real-ip; ignores spoofed XFF prefix", () => {
  const asReq = (headers: Record<string, string>) =>
    ({ headers: { get: (name: string) => headers[name.toLowerCase()] ?? null } }) as NextRequest;
  assert.equal(
    clientIp(asReq({ "x-vercel-forwarded-for": "8.8.8.8", "x-forwarded-for": "9.9.9.9, 1.1.1.1" })),
    "8.8.8.8"
  );
  assert.equal(clientIp(asReq({ "x-real-ip": "10.0.0.1", "x-forwarded-for": "1.1.1.1, 2.2.2.2" })), "10.0.0.1");
  assert.equal(clientIp(asReq({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" })), "1.1.1.1");
  assert.equal(clientIp(asReq({})), "unknown");
});

test("client IP with TRUSTED_PROXY_HOPS uses rightmost trusted hop", () => {
  const prev = process.env.TRUSTED_PROXY_HOPS;
  process.env.TRUSTED_PROXY_HOPS = "1";
  const asReq = (headers: Record<string, string>) =>
    ({ headers: { get: (name: string) => headers[name.toLowerCase()] ?? null } }) as NextRequest;
  assert.equal(
    clientIp(asReq({ "x-forwarded-for": "203.0.113.7, 198.51.100.42" })),
    "198.51.100.42"
  );
  if (prev === undefined) delete process.env.TRUSTED_PROXY_HOPS;
  else process.env.TRUSTED_PROXY_HOPS = prev;
});
