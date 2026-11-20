/**
 * Build an off-repo restore package from the live Vercel portal public APIs
 * and downloadable Supabase Storage public objects. Does not write to Postgres.
 *
 * Usage:
 *   node scripts/build-restore-package.mjs /absolute/path/outside-repo/ksl-restore
 *
 * Optional:
 *   SOURCE_PORTAL_URL=https://ksl-websitekiza.vercel.app
 */
import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

function stableId(seed) {
  const hash = createHash("sha256").update(String(seed)).digest();
  hash[6] = (hash[6] & 0x0f) | 0x40;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const outRoot = process.argv[2];
const sourcePortal = (process.env.SOURCE_PORTAL_URL || "https://ksl-websitekiza.vercel.app").replace(/\/$/, "");
const supabasePublic = "https://envqgczfhxywkxcnsxrt.supabase.co/storage/v1/object/public";

function outsideRepo(value) {
  const resolved = path.resolve(value);
  return resolved !== repositoryRoot && !resolved.startsWith(`${repositoryRoot}${path.sep}`);
}

if (!outRoot || !path.isAbsolute(outRoot) || !outsideRepo(outRoot)) {
  console.error("Usage: node scripts/build-restore-package.mjs /absolute/path/outside-repo/ksl-restore");
  process.exit(1);
}

const ENDPOINTS = [
  "news", "events", "gallery", "services", "products", "projects", "careers",
  "faq", "csr", "downloads", "organization", "press", "settings", "site-images",
];

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "ksl-restore-package" } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json();
}

function rewriteSiteAsset(value) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  const vercelImg = trimmed.match(/^https?:\/\/(?:www\.)?ksl-website\.vercel\.app\/(img\/ksl\/.+)$/i);
  if (vercelImg) return vercelImg[1];
  return trimmed;
}

function supabaseObject(value) {
  if (typeof value !== "string") return null;
  const match = value.trim().match(
    /^https?:\/\/[^/]+\/storage\/v1\/object\/(?:public|sign|authenticated)\/(media-public|downloads|avatars)\/(.+)$/i,
  );
  if (!match) return null;
  return { bucket: match[1], path: decodeURIComponent(match[2]) };
}

function walkStrings(value, visit) {
  if (typeof value === "string") return void visit(value);
  if (Array.isArray(value)) return value.forEach((item) => walkStrings(item, visit));
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) walkStrings(item, visit);
  }
}

function mapRewrite(value, rewrite) {
  if (typeof value === "string") return rewrite(value);
  if (Array.isArray(value)) return value.map((item) => mapRewrite(item, rewrite));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mapRewrite(v, rewrite)]));
  }
  return value;
}

function localize(value) {
  const rewritten = rewriteSiteAsset(value);
  const object = supabaseObject(rewritten);
  return object ? object.path : rewritten;
}

const publicSnapshot = {};
for (const endpoint of ENDPOINTS) {
  publicSnapshot[endpoint] = await fetchJson(`${sourcePortal}/api/public/${endpoint}`);
  console.info(`fetched /api/public/${endpoint}`);
}

const remoteObjects = new Map();
walkStrings(publicSnapshot, (value) => {
  const object = supabaseObject(value);
  if (object) remoteObjects.set(`${object.bucket}/${object.path}`, object);
});

const storageRoot = path.join(outRoot, "storage");
const missing = [];
const downloaded = [];
for (const object of remoteObjects.values()) {
  const target = path.join(storageRoot, object.bucket, object.path);
  await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  const downloadUrl = `${supabasePublic}/${object.bucket}/${object.path.split("/").map(encodeURIComponent).join("/")}`;
  try {
    const res = await fetch(downloadUrl);
    if (!res.ok) {
      missing.push({ ...object, status: res.status, url: downloadUrl });
      continue;
    }
    const bytes = Buffer.from(await res.arrayBuffer());
    await writeFile(target, bytes, { mode: 0o600 });
    downloaded.push({ ...object, bytes: bytes.length });
  } catch (error) {
    missing.push({ ...object, error: error instanceof Error ? error.message : String(error), url: downloadUrl });
  }
}

const localized = mapRewrite(publicSnapshot, localize);

const galleryPhotos = (localized.gallery?.photos ?? []).map((item, index) => ({
  id: stableId(`gallery-photo:${item.src || item.title || index}`),
  title: item.title ?? "",
  alt_text: item.alt || item.title || null,
  category: item.category || "all",
  tags: item.tags ?? [],
  storage_path: item.src ?? null,
  public_url: null,
  sort_order: index,
  status: "published",
}));
const galleryVideos = (localized.gallery?.videos ?? []).map((item, index) => ({
  id: stableId(`gallery-video:${item.youtubeId || index}`),
  youtube_id: item.youtubeId,
  title: item.title ?? "",
  caption: item.caption ?? null,
  featured: Boolean(item.featured),
  sort_order: index,
  status: "published",
}));

const newsItems = (localized.news?.items ?? []).map((item) => ({
  id: stableId(`news:${item.slug}`),
  slug: item.slug,
  title: item.title,
  excerpt: item.excerpt ?? null,
  category: item.category ?? "News",
  published_date: item.date ?? null,
  image_path: item.image ?? null,
  author: item.author ?? null,
  location: item.location ?? null,
  body_html: item.body ?? null,
  status: "published",
  published_at: item.date ? `${item.date}T12:00:00.000Z` : new Date().toISOString(),
}));

const eventItems = [...(localized.events?.upcoming ?? []), ...(localized.events?.past ?? [])]
  .filter((item) => item?.slug && item?.title && (item.date || item.event_date))
  .map((item) => ({
    id: stableId(`event:${item.slug}`),
    slug: item.slug,
    title: item.title,
    theme: item.theme ?? null,
    event_date: item.date || item.event_date,
    time_start: item.timeStart ?? item.time_start ?? null,
    time_end: item.timeEnd ?? item.time_end ?? null,
    venue: item.venue ?? item.location ?? null,
    description: item.description ?? null,
    summary: item.summary ?? item.excerpt ?? null,
    image_path: item.image ?? null,
    body_html: item.body ?? null,
    status: "published",
  }));

const serviceItems = (localized.services?.items ?? []).map((item, index) => ({
  id: stableId(`service:${item.slug}`),
  slug: item.slug,
  category: item.category ?? null,
  title: item.title,
  excerpt: item.excerpt ?? null,
  detail: item.detail ?? null,
  image_path: item.image ?? null,
  downloads: item.downloads ?? [],
  source_popup_id: item.sourcePopupId ?? null,
  sort_order: index,
  status: "published",
}));

const products = (localized.products?.items ?? []).map((item, index) => ({
  id: stableId(`product:${item.slug}`),
  slug: item.slug,
  name: item.name || item.title,
  category: item.category ?? "other",
  category_label: item.categoryLabel ?? item.category ?? "Other",
  eyebrow: item.eyebrow ?? null,
  image_path: item.image ?? null,
  image_alt: item.imageAlt ?? null,
  key_specs: item.keySpecs ?? [],
  extra_specs: item.extraSpecs ?? [],
  sort_order: index,
  status: "published",
}));

const projects = (localized.projects?.items ?? []).map((item, index) => ({
  id: stableId(`project:${item.slug}`),
  slug: item.slug,
  title: item.title,
  subtitle: item.subtitle ?? null,
  category: item.category ?? "other",
  category_label: item.categoryLabel ?? item.category ?? "Other",
  image_path: item.image ?? null,
  details: item.details ?? item.body ?? null,
  sort_order: index,
  status: "published",
}));

const faqGroups = [];
const faqItems = [];
for (const [index, group] of (localized.faq?.groups ?? []).entries()) {
  const groupId = String(group.id || `group-${index + 1}`);
  faqGroups.push({
    id: groupId,
    title: group.title,
    sort_order: index,
    status: "published",
  });
  for (const [itemIndex, item] of (group.items ?? []).entries()) {
    const question = item.question ?? item.q;
    const answer = item.answer ?? item.a;
    if (!question || !answer) continue;
    faqItems.push({
      id: stableId(`faq-item:${groupId}:${question}`),
      group_id: groupId,
      question,
      answer,
      sort_order: itemIndex,
      status: "published",
    });
  }
}

function dateOrNull(value) {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  if (/^\d{4}$/.test(text)) return `${text}-01-01`;
  return null;
}

const csrProjects = (localized.csr?.programmes ?? []).map((item, index) => ({
  id: stableId(`csr:${item.slug || item.title || index}`),
  slug: item.slug || `csr-${index + 1}`,
  title: item.title,
  summary: item.summary ?? item.excerpt ?? null,
  image_path: item.image ?? null,
  image_alt: item.imageAlt ?? null,
  location: item.location ?? null,
  event_date: dateOrNull(item.date),
  sort_order: index,
  status: "published",
}));

const downloadItems = (localized.downloads?.items ?? []).map((item, index) => ({
  id: String(item.id || `download-${index + 1}`),
  title: item.title,
  subtitle: item.subtitle ?? null,
  category: item.category || "general",
  category_label: item.categoryLabel || item.category || "General",
  language: item.language ?? null,
  doc_date: item.date ?? null,
  file_type: item.type ?? null,
  file_name: item.filename || item.file || null,
  anchor: item.anchor ?? null,
  external_href: item.href ?? null,
  source: "standard",
  sort_order: index,
  status: "published",
}));

const leadership = (localized.organization?.leadership ?? []).map((item, index) => ({
  id: stableId(`org-leadership:${item.role}:${index}`),
  role: item.role,
  summary: item.summary ?? null,
  sort_order: index,
  status: "published",
}));

const board = (localized.organization?.board ?? []).map((item, index) => ({
  id: stableId(`org-board:${item.name}:${item.role}:${index}`),
  full_name: item.name,
  role: item.role,
  board_group: item.group || "independent",
  section: item.section || "audit",
  summary: item.summary ?? null,
  bio: item.bio ?? null,
  photo_url: item.photo ?? null,
  sort_order: index,
  status: "published",
}));

const milestones = (localized.organization?.milestones ?? []).map((item, index) => {
  const rawDate = item.date || item.when || null;
  let happenedOn = null;
  let precision = null;
  if (typeof rawDate === "string" && /^\d{4}$/.test(rawDate)) {
    happenedOn = `${rawDate}-01-01`;
    precision = "year";
  } else if (typeof rawDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    happenedOn = rawDate;
    precision = "day";
  }
  return {
    id: stableId(`org-milestone:${item.title}:${rawDate}:${index}`),
    happened_on: happenedOn,
    date_precision: precision,
    title: item.title ?? null,
    summary: item.summary ?? null,
    image_url: item.image ?? null,
    image_alt: item.alt ?? null,
    image_slot: item.imageSlot ?? null,
    story_key: item.story ?? null,
    tag_label: item.tag ?? null,
    tag_note: item.note ?? null,
    sort_order: index,
    status: "published",
  };
});

const pressAssets = (localized.press?.assets ?? []).map((item, index) => ({
  id: stableId(`press:${item.title}:${index}`),
  title: item.title,
  href: item.href || item.url || null,
  download_id: item.downloadId || item.file || null,
  asset_type: item.type ?? null,
  sort_order: index,
  status: "published",
}));

const careerListings = [
  ...(localized.careers?.vacancies ?? []).map((item) => ({ ...item, kind: "vacancy" })),
  ...(localized.careers?.internships ?? []).map((item) => ({ ...item, kind: "internship" })),
].map((item, index) => ({
  id: stableId(`career:${item.kind}:${item.title}:${index}`),
  kind: item.kind,
  title: item.title,
  location: item.location ?? null,
  summary: item.summary ?? item.excerpt ?? null,
  closing_date: item.closingDate ?? null,
  apply_url: item.applyUrl ?? null,
  sort_order: index,
  status: "published",
}));

const siteSettings = Object.entries(localized.settings ?? {}).map(([key, value]) => ({
  key,
  value,
  status: "published",
}));

const siteImageOverrides = [];
for (const [slotId, rawUrl] of Object.entries(publicSnapshot["site-images"]?.images ?? {})) {
  if (!rawUrl || slotId === "chrome.home-hero") continue;
  const url = localize(rawUrl);
  siteImageOverrides.push({
    slot_id: slotId,
    source: "storage",
    public_url: url,
    storage_path: url.startsWith("img/") ? url : url,
    media: [],
  });
}
const hero = publicSnapshot["site-images"]?.hero;
if (Array.isArray(hero) && hero.length) {
  siteImageOverrides.push({
    slot_id: "chrome.home-hero",
    source: "storage",
    public_url: null,
    storage_path: null,
    media: hero.map((item) => {
      const url = localize(item.url);
      const kind = item.kind || (/\.(mp4|webm)(\?|#|$)/i.test(String(item.url || url)) ? "video" : "image");
      return {
        kind,
        public_url: url,
        storage_path: url.startsWith("img/") ? url : url,
        crop: item.crop ?? null,
        trim: item.trim ?? null,
        title: item.title ?? "Catalyzing Shipbuilding Industry",
        subtitle: item.subtitle ?? "",
        buttonLabel: item.buttonLabel ?? "Read our story",
        buttonUrl: item.buttonUrl ?? "about.html",
      };
    }),
  });
}

const tables = {
  news_items: newsItems,
  event_items: eventItems,
  gallery_photos: galleryPhotos,
  gallery_videos: galleryVideos,
  services_settings: [{
    id: "default",
    intro: localized.services?.intro ?? "",
    download_catalog: localized.services?.downloadCatalog ?? {},
    group_order: localized.services?.groupOrder ?? [],
  }],
  service_items: serviceItems,
  products_settings: [{
    id: "default",
    kicker: localized.products?.kicker ?? null,
    title: localized.products?.title ?? null,
    intro: localized.products?.intro ?? null,
    catalogue_url: localized.products?.catalogueUrl ?? null,
    range_kicker: localized.products?.rangeKicker ?? null,
    range_title: localized.products?.rangeTitle ?? null,
    range_groups: localized.products?.rangeGroups ?? [],
  }],
  products,
  projects_settings: [{ id: "default", group_order: localized.projects?.groupOrder ?? [] }],
  projects,
  faq_groups: faqGroups,
  faq_items: faqItems,
  csr_settings: [{
    id: "default",
    kicker: localized.csr?.kicker ?? null,
    title: localized.csr?.title ?? null,
    tagline: localized.csr?.tagline ?? null,
    intro: localized.csr?.intro ?? null,
    badges: localized.csr?.badges ?? [],
    hero_images: localized.csr?.heroImages ?? [],
    stats: localized.csr?.stats ?? [],
    footnote: localized.csr?.footnote ?? null,
    programmes_title: localized.csr?.programmesTitle ?? null,
    programmes_intro: localized.csr?.programmesIntro ?? null,
  }],
  csr_projects: csrProjects,
  downloads_settings: [{ id: "default", base_url: localized.downloads?.baseUrl ?? null }],
  download_items: downloadItems,
  organization_settings: [{
    id: "default",
    chart_download_id: localized.organization?.chartDownloadId ?? null,
    intro_kicker: localized.organization?.intro?.kicker ?? null,
    intro_title: localized.organization?.intro?.title ?? null,
    intro_body: localized.organization?.intro?.body ?? null,
    chart: localized.organization?.chart ?? {},
    board_sections: localized.organization?.boardSections ?? [],
    board_groups: localized.organization?.boardGroups ?? [],
    milestones_title: localized.organization?.milestonesTitle ?? null,
    milestones_lead: localized.organization?.milestonesLead ?? null,
  }],
  organization_leadership: leadership,
  organization_board_members: board,
  organization_milestones: milestones,
  press_settings: [{
    id: "default",
    boilerplate: localized.press?.boilerplate ?? null,
    contact_email: localized.press?.contactEmail ?? null,
    contact_phone: localized.press?.contactPhone ?? null,
  }],
  press_assets: pressAssets,
  careers_settings: [{
    id: "default",
    apply_email: localized.careers?.applyEmail ?? null,
    apply_note: localized.careers?.applyNote ?? null,
  }],
  career_listings: careerListings,
  site_settings: siteSettings,
  site_image_overrides: siteImageOverrides,
};

const report = {
  built_at: new Date().toISOString(),
  source_portal: sourcePortal,
  tables: Object.fromEntries(Object.entries(tables).map(([name, rows]) => [name, rows.length])),
  media: {
    remote_objects_found: remoteObjects.size,
    downloaded: downloaded.length,
    missing: missing.length,
    missing_details: missing,
  },
  notes: [
    "Relative img/ksl assets stay as paths; publish the static site so /img/ksl is served.",
    "Downloaded Supabase objects go under storage/<bucket>/… for import:storage-objects.",
    "Staff accounts are intentionally omitted from this package.",
    "Idempotent import uses ON CONFLICT keys in import:content-export.",
    "Do not import on production until this package is reviewed and authorized.",
  ],
};

await mkdir(outRoot, { recursive: true, mode: 0o700 });
await writeFile(path.join(outRoot, "public-snapshot.json"), `${JSON.stringify(publicSnapshot, null, 2)}\n`, { mode: 0o600 });
await writeFile(path.join(outRoot, "content-export.json"), `${JSON.stringify({ tables }, null, 2)}\n`, { mode: 0o600 });
await writeFile(path.join(outRoot, "REPORT.json"), `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });

console.info(JSON.stringify(report, null, 2));
console.info(`Restore package written to ${outRoot}`);
