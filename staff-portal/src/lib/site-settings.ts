export type ContactSettings = {
  phone: string;
  email: string;
  mdPhone: string;
  mdEmail: string;
  postalAddress: string;
  whatsapp: string;
};

export type SocialSettings = {
  facebook: string;
  x: string;
  instagram: string;
};

export type LocationEntry = { name: string; address: string };

export type FooterSettings = {
  tagline: string;
  copyright: string;
  locations: LocationEntry[];
};

export const BANNER_DESIGNS = [
  "notice",
  "navy",
  "tide",
  "flag",
  "split",
  "pennant",
  "plate",
  "night",
  "tender",
  "alert",
  "nav-line",
  "quay",
  "berth",
  "channel",
] as const;

export type BannerDesign = (typeof BANNER_DESIGNS)[number];

/** Older saved names still stored in the database. */
export type BannerStyle =
  | BannerDesign
  | "harbour-line"
  | "keel-stripe"
  | "signal-flag"
  | "dry-dock"
  | "tender-notice"
  | "quiet-gold"
  | "night-watch"
  | "yard-bell"
  | "split-bar"
  | "brass-plate"
  | "log-entry"
  | "mast-pennant"
  | "sea-glass"
  | "alert-bar"
  | "chapter-head"
  | "inset-rule"
  | "shipyard-stamp"
  | "two-weights"
  | "command-strip"
  | "gold"
  | "light"
  | "kenya"
  | "forest"
  | "midnight"
  | "framed";

const BANNER_ALIASES: Record<string, BannerDesign> = {
  notice: "notice",
  "harbour-line": "notice",
  "quiet-gold": "notice",
  "log-entry": "notice",
  "chapter-head": "notice",
  "inset-rule": "notice",
  "two-weights": "notice",
  "sea-glass": "notice",
  light: "notice",
  framed: "notice",
  navy: "navy",
  "keel-stripe": "navy",
  "yard-bell": "navy",
  "shipyard-stamp": "navy",
  "command-strip": "navy",
  "dry-dock": "navy",
  gold: "navy",
  forest: "navy",
  tide: "tide",
  flag: "flag",
  "signal-flag": "flag",
  kenya: "flag",
  split: "split",
  "split-bar": "split",
  pennant: "pennant",
  "mast-pennant": "pennant",
  plate: "plate",
  "brass-plate": "plate",
  night: "night",
  "night-watch": "night",
  midnight: "night",
  tender: "tender",
  "tender-notice": "tender",
  alert: "alert",
  "alert-bar": "alert",
  "nav-line": "nav-line",
  quay: "quay",
  berth: "berth",
  channel: "channel",
  lake: "quay",
  shore: "quay",
  reed: "quay",
  yard: "quay",
  corner: "navy",
  launch: "navy",
};

export function bannerDesign(value: unknown): BannerDesign {
  return BANNER_ALIASES[String(value)] || "navy";
}

/** Where a design is drawn. The id decides this; nothing extra is stored. */
export function bannerPlacement(design: BannerDesign): "bar" | "nav" {
  if (design === "nav-line") return "nav";
  return "bar";
}

export type MenuStyle = "classic" | "cards" | "soft" | "line" | "compact";

export type AppearanceSettings = {
  menuStyle: MenuStyle;
};

export type MaintenanceSettings = {
  /** Visitors who open the public site by an IP address see the maintenance page. */
  enabled: boolean;
  /** Nairobi wall clock, YYYY-MM-DDTHH:mm. Empty stays up until the switch is turned off. */
  endsAt: string;
  /** Replaces the standard sentence. Empty keeps the standard sentence. */
  message: string;
};

export type YardPhotos = {
  quay: string;
  berth: string;
  channel: string;
};

export type BannerItem = {
  id: string;
  enabled: boolean;
  label: string;
  text: string;
  linkLabel: string;
  linkUrl: string;
  style: BannerDesign;
  scroll: boolean;
  /** YYYY-MM-DD. Empty means it may show as soon as it is switched on. */
  startsOn: string;
  /** YYYY-MM-DD. Empty means it stays up until it is switched off. */
  endsOn: string;
};

export type AnnouncementSettings = {
  enabled: boolean;
  label: string;
  text: string;
  linkLabel: string;
  linkUrl: string;
  style: BannerStyle;
  scroll: boolean;
  endsOn: string;
  startsOn: string;
  photos: YardPhotos;
  /** Banners in the order visitors should see them. Missing means the older single banner. */
  queue: BannerItem[];
};

export const BANNER_QUEUE_LIMIT = 12;

export function todayInNairobi() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date());
}

export function bannerInWindow(item: { startsOn?: string; endsOn?: string }, today = todayInNairobi()) {
  if (item.startsOn && today < item.startsOn) return false;
  if (item.endsOn && today > item.endsOn) return false;
  return true;
}

function cleanDate(value: unknown) {
  const day = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : "";
}

export function acceptedBannerLink(value: string) {
  const url = value.trim();
  return !url || cleanLink(url) === url;
}

function cleanLink(value: unknown) {
  const url = String(value ?? "").trim().slice(0, 500);
  if (!url) return "";
  if (/^https?:\/\/[^\s"'<>]+$/i.test(url)) return url;
  if (/^[\w./#?=&%-]+$/.test(url) && !url.includes("..")) return url;
  return "";
}

function cleanPhoto(value: unknown) {
  const url = String(value ?? "").trim();
  if (url.length > 500 || /[\s"'()\\]/.test(url)) return "";
  if (/^https:\/\/[^/]+\/.+/i.test(url)) return url;
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  if (/^(img|storage)\//i.test(url) && !url.includes("..")) return url;
  return "";
}

export function cleanYardPhotos(value: unknown): YardPhotos {
  const raw = value && typeof value === "object" ? (value as Partial<YardPhotos>) : {};
  return {
    quay: cleanPhoto(raw.quay),
    berth: cleanPhoto(raw.berth),
    channel: cleanPhoto(raw.channel),
  };
}

function cleanBannerItem(
  raw: {
    id?: string;
    enabled?: boolean;
    label?: string;
    text?: string;
    linkLabel?: string;
    linkUrl?: string;
    style?: BannerStyle;
    scroll?: boolean;
    startsOn?: string;
    endsOn?: string;
  } | null | undefined,
  index: number
): BannerItem {
  const source = raw ?? {};
  const id = typeof source.id === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(source.id) ? source.id : `banner-${index + 1}`;
  return {
    id,
    enabled: typeof source.enabled === "boolean" ? source.enabled : false,
    label: String(source.label ?? "Announcement").slice(0, 24),
    text: String(source.text ?? "").slice(0, 220),
    linkLabel: String(source.linkLabel ?? "").slice(0, 30),
    linkUrl: cleanLink(source.linkUrl),
    style: bannerDesign(source.style),
    scroll: Boolean(source.scroll),
    startsOn: cleanDate(source.startsOn),
    endsOn: cleanDate(source.endsOn),
  };
}

export function blankBanner(): BannerItem {
  return {
    id: `banner-${Date.now().toString(36)}`,
    enabled: true,
    label: "Announcement",
    text: "",
    linkLabel: "",
    linkUrl: "",
    style: "navy",
    scroll: false,
    startsOn: "",
    endsOn: "",
  };
}

/** Keeps a saved banner working, and turns a queue into the one banner older pages still understand. */
export function normalizeAnnouncement(input: Partial<AnnouncementSettings> | null | undefined, hasQueue = Array.isArray(input?.queue)): AnnouncementSettings {
  const raw = { ...DEFAULT_SITE_SETTINGS.announcement, ...(input ?? {}) };
  const photos = cleanYardPhotos(input?.photos);
  const queue = (hasQueue ? (input?.queue ?? []) : [raw])
    .slice(0, BANNER_QUEUE_LIMIT)
    .map((item, index) => cleanBannerItem(item, index));
  const live = queue.find((item) => item.enabled && item.text.trim() && bannerInWindow(item)) ?? null;
  const face = live ?? queue[0];
  return {
    enabled: Boolean(live),
    label: face?.label || "Announcement",
    text: live?.text ?? "",
    linkLabel: live?.linkLabel ?? "",
    linkUrl: live?.linkUrl ?? "",
    style: bannerDesign(face?.style),
    scroll: Boolean(face?.scroll),
    startsOn: live?.startsOn ?? "",
    endsOn: live?.endsOn ?? "",
    photos,
    queue,
  };
}

export type WhatWeDoCard = {
  id: string;
  title: string;
  excerpt: string;
  detail: string;
  image: string;
  imageSlot: string;
  link: string;
  linkLabel: string;
  buttonLabel: string;
  icon: string;
  enabled: boolean;
};

export type WhatWeDoSettings = {
  label: string;
  cards: WhatWeDoCard[];
};

export type SiteSettings = {
  contact: ContactSettings;
  social: SocialSettings;
  footer: FooterSettings;
  announcement: AnnouncementSettings;
  appearance: AppearanceSettings;
  maintenance: MaintenanceSettings;
  what_we_do: WhatWeDoSettings;
};

export const SITE_SETTING_KEYS = ["contact", "social", "footer", "announcement", "appearance", "maintenance", "what_we_do"] as const;
export type SiteSettingKey = (typeof SITE_SETTING_KEYS)[number];

export const WHAT_WE_DO_ICONS = [
  "ship",
  "civil",
  "heavy",
  "mro",
  "grp",
] as const;

export type WhatWeDoIcon = (typeof WHAT_WE_DO_ICONS)[number];

export const DEFAULT_WHAT_WE_DO_CARDS: WhatWeDoCard[] = [
  {
    id: "ship-construction",
    title: "Ship Construction",
    excerpt: "Patrol craft, ferries, and support vessels, designed and built for the Kenya Navy, MDAs, and regional partners.",
    detail:
      "Kenya Shipyards Limited delivers end-to-end new construction from concept and class design through steel work, outfitting, and sea trials. Projects include naval patrol boats, passenger ferries, landing craft, and specialist vessels for ministries, departments and agencies with maritime assets. Builds are managed under ISO 9001 with quality checks at each stage. KSL yards at Mtongwe and Kisumu provide dry berths, fabrication, and skilled trades for GRP, aluminium and steel hulls.",
    image: "img/ksl/yard.jpg",
    imageSlot: "index.9-ship-construction",
    link: "service.html",
    linkLabel: "View all services",
    buttonLabel: "Read More",
    icon: "ship",
    enabled: true,
  },
  {
    id: "civil-modular",
    title: "Civil and Modular Works",
    excerpt: "Marine civil works, piers, jetties, linkspans, and modular structures that keep ports and yards operating.",
    detail:
      "Beyond the slipway, KSL engineers and installs shore-side infrastructure: reinforced quays, finger piers, linkspans, fender systems, and modular buildings for workshops and stores. Teams coordinate civil, structural, and electrical scopes so naval bases and commercial harbours gain reliable access for vessels and cargo. Modular approaches shorten on-site time while meeting defence and port authority standards.",
    image: "img/ksl/linkspan.webp",
    imageSlot: "index.10-civil-and-modular-works",
    link: "service.html",
    linkLabel: "View all services",
    buttonLabel: "Read More",
    icon: "civil",
    enabled: true,
  },
  {
    id: "heavy-engineering",
    title: "Heavy Engineering",
    excerpt: "Remanufacture, rehabilitation and fabrication of locomotives for Kenya Railways Corporation.",
    detail:
      "KSL applies shipyard-grade welding, machining, and project controls to heavy engineering on land. Capabilities include locomotive remanufacture, rehabilitation, refurbishment, structural steel for locomotives, and bespoke mechanical assemblies. The same quality systems used for naval contracts support ministries, parastatals, and private industry that need proven fabrication capacity in Eastern Africa.",
    image: "img/ksl/mombasa.webp",
    imageSlot: "index.11-heavy-engineering",
    link: "service.html",
    linkLabel: "View all services",
    buttonLabel: "Read More",
    icon: "heavy",
    enabled: true,
  },
  {
    id: "mro",
    title: "Maintenance Repair and Overhaul",
    excerpt: "Scheduled refits, emergency repairs, and dry docking to keep fleets mission ready and class compliant.",
    detail:
      "MRO services cover hull and superstructure repairs, corrosion protection, propulsion, auxiliary overhauls, shaft alignment, navigation and weapon systems support for naval vessels. Docking at Mtongwe and Kisumu includes blasting, coating, and steel renewal to class and military specifications. KSL plans maintenance windows with operators to minimise downtime while extending vessel life.",
    image: "img/ksl/kisumu.webp",
    imageSlot: "index.12-maintenance-repair-and-overhaul",
    link: "service.html",
    linkLabel: "View all services",
    buttonLabel: "Read More",
    icon: "mro",
    enabled: true,
  },
  {
    id: "grp-boats",
    title: "GRP Boats",
    excerpt: "Light, durable GRP hulls for patrol, fisheries, ambulance response, and county water transport.",
    detail:
      "Glass-reinforced plastic boats are moulded and finished in-house for roles that need speed, shallow draft, and low maintenance. Standard and custom layouts serve Kenya Navy auxiliaries, county governments, fisheries cooperatives, and emergency medical transport on lakes and coastal waters. KSL supports operators with spares, repairs, and training for safe day-to-day use.",
    image: "img/ksl/fishing.jpg",
    imageSlot: "index.13-grp-boats",
    link: "products.html",
    linkLabel: "Browse products",
    buttonLabel: "Read More",
    icon: "grp",
    enabled: true,
  },
];

export function blankWhatWeDoCard(): WhatWeDoCard {
  return {
    id: crypto.randomUUID(),
    title: "",
    excerpt: "",
    detail: "",
    image: "",
    imageSlot: "",
    link: "service.html",
    linkLabel: "View all services",
    buttonLabel: "Read More",
    icon: "ship",
    enabled: true,
  };
}

function cleanWhatWeDoCard(raw: Partial<WhatWeDoCard> | null | undefined, index: number): WhatWeDoCard {
  const source = raw ?? {};
  const rawId = typeof source.id === "string" ? source.id.trim() : "";
  const id = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId)
    ? rawId
    : typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
  const icon = WHAT_WE_DO_ICONS.includes(source.icon as WhatWeDoIcon) ? (source.icon as WhatWeDoIcon) : "ship";
  return {
    id,
    title: String(source.title ?? "").trim().slice(0, 80),
    excerpt: String(source.excerpt ?? "").trim().slice(0, 280),
    detail: String(source.detail ?? "").trim().slice(0, 4000),
    image: cleanPhoto(source.image),
    imageSlot: String(source.imageSlot ?? "").trim().slice(0, 120),
    link: cleanLink(source.link) || "service.html",
    linkLabel: String(source.linkLabel ?? "View all services").trim().slice(0, 40) || "View all services",
    buttonLabel: String(source.buttonLabel ?? "Read More").trim().slice(0, 30) || "Read More",
    icon,
    enabled: typeof source.enabled === "boolean" ? source.enabled : true,
  };
}

export function normalizeWhatWeDo(input?: unknown): WhatWeDoSettings {
  const raw = input && typeof input === "object" ? (input as Partial<WhatWeDoSettings>) : null;
  const cards = Array.isArray(raw?.cards) ? raw.cards.map((card, index) => cleanWhatWeDoCard(card, index)).slice(0, 12) : [];
  return {
    label: String(raw?.label ?? "What we do").trim().slice(0, 40) || "What we do",
    cards,
  };
}

/** Label-only payload for site_settings — cards live in home_what_we_do_items. */
export function normalizeWhatWeDoLabel(input?: unknown): WhatWeDoSettings {
  const raw = input && typeof input === "object" ? (input as Partial<WhatWeDoSettings>) : null;
  return {
    label: String(raw?.label ?? "What we do").trim().slice(0, 40) || "What we do",
    cards: [],
  };
}

export type WhatWeDoItemRow = {
  id: string;
  title: string;
  excerpt: string | null;
  detail: string | null;
  image_path: string | null;
  image_slot: string | null;
  link: string;
  link_label: string;
  button_label: string;
  icon: string;
  sort_order: number;
  status: string;
  deleted_at?: string | null;
};

export function whatWeDoCardFromRow(row: WhatWeDoItemRow): WhatWeDoCard {
  return cleanWhatWeDoCard(
    {
      id: row.id,
      title: row.title,
      excerpt: row.excerpt ?? "",
      detail: row.detail ?? "",
      image: row.image_path ?? "",
      imageSlot: row.image_slot ?? "",
      link: row.link,
      linkLabel: row.link_label,
      buttonLabel: row.button_label,
      icon: row.icon,
      enabled: row.status === "published",
    },
    row.sort_order,
  );
}

export function whatWeDoRowFromCard(card: WhatWeDoCard, sortOrder: number, userId: string | null) {
  const cleaned = cleanWhatWeDoCard(card, sortOrder);
  return {
    id: cleaned.id,
    title: cleaned.title || "Untitled card",
    excerpt: cleaned.excerpt || null,
    detail: cleaned.detail || null,
    image_path: cleaned.image || null,
    image_slot: cleaned.imageSlot || null,
    link: cleaned.link,
    link_label: cleaned.linkLabel,
    button_label: cleaned.buttonLabel,
    icon: cleaned.icon,
    sort_order: sortOrder,
    status: cleaned.enabled ? "published" : "draft",
    updated_by: userId,
  };
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  contact: {
    phone: "+254 726 277 377",
    email: "publicaffairs@kenyashipyards.co.ke",
    mdPhone: "+254 700 278 278",
    mdEmail: "info@kenyashipyards.co.ke",
    postalAddress: "P.O. Box 9706 00200 Nairobi",
    whatsapp: "254726277377",
  },
  social: {
    facebook: "https://www.facebook.com/kenyashipyardslimited",
    x: "https://x.com/KenyaShipyards",
    instagram: "https://www.instagram.com/kenyashipyards",
  },
  footer: {
    tagline: "Catalyzing Shipbuilding Industry",
    copyright: "© 2025, All Rights Reserved by Kenya Shipyards Limited.",
    locations: [
      { name: "Nairobi Head Office", address: "Herufi House, Treasury Buildings." },
      { name: "Mombasa Shipyard", address: "Next to Kenya Navy Base, Mtongwe." },
      { name: "Kisumu Shipyard", address: "Next to Kisumu Port, along Marine Drive." },
    ],
  },
  announcement: {
    enabled: false,
    label: "Announcement",
    text: "",
    linkLabel: "",
    linkUrl: "",
    style: "command-strip",
    scroll: false,
    startsOn: "",
    endsOn: "",
    photos: { quay: "", berth: "", channel: "" },
    queue: [],
  },
  appearance: {
    menuStyle: "classic",
  },
  maintenance: {
    enabled: false,
    endsAt: "",
    message: "",
  },
  what_we_do: {
    label: "What we do",
    cards: DEFAULT_WHAT_WE_DO_CARDS,
  },
};

/** Keep a datetime-local value as Nairobi wall time, or blank when it is not a real moment. */
export function cleanMaintenanceEndsAt(value: unknown) {
  const raw = String(value ?? "").trim();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  if (!match) return "";
  const wall = `${match[1]}T${match[2]}`;
  const ms = Date.parse(`${wall}:00+03:00`);
  return Number.isNaN(ms) ? "" : wall;
}

export function cleanMaintenanceMessage(value: unknown) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .trim()
    .slice(0, 400);
}

export function normalizeMaintenance(input?: unknown): MaintenanceSettings {
  const raw = input && typeof input === "object" ? input as Partial<MaintenanceSettings> : null;
  return {
    enabled: Boolean(raw?.enabled),
    endsAt: cleanMaintenanceEndsAt(raw?.endsAt),
    message: cleanMaintenanceMessage(raw?.message),
  };
}

/** True while the switch is on and the Nairobi end time, if set, is still ahead. */
export function maintenanceIsActive(settings: MaintenanceSettings, now = Date.now()) {
  if (!settings.enabled) return false;
  if (!settings.endsAt) return true;
  const ends = Date.parse(`${settings.endsAt}:00+03:00`);
  return !Number.isNaN(ends) && ends > now;
}

export function mergeSiteSettings(rows: { key: string; value: unknown }[]): SiteSettings {
  const merged: SiteSettings = structuredClone(DEFAULT_SITE_SETTINGS);
  for (const row of rows) {
    if (!(SITE_SETTING_KEYS as readonly string[]).includes(row.key)) continue;
    const key = row.key as SiteSettingKey;
    merged[key] = { ...merged[key], ...(row.value as object) } as never;
  }
  const rawAnnouncement = rows.find((row) => row.key === "announcement")?.value;
  const hasQueue = !!rawAnnouncement && typeof rawAnnouncement === "object" && Array.isArray((rawAnnouncement as AnnouncementSettings).queue);
  merged.announcement = normalizeAnnouncement(
    { ...DEFAULT_SITE_SETTINGS.announcement, ...(rawAnnouncement && typeof rawAnnouncement === "object" ? rawAnnouncement : {}) },
    hasQueue
  );
  merged.maintenance = normalizeMaintenance(merged.maintenance);
  const rawWhatWeDo = rows.find((row) => row.key === "what_we_do")?.value;
  const normalized = normalizeWhatWeDo(rawWhatWeDo ?? merged.what_we_do);
  merged.what_we_do = {
    label: normalized.label,
    // Prefer legacy JSON cards until home_what_we_do_items is seeded; public API overlays the table.
    cards: normalized.cards.length ? normalized.cards : structuredClone(DEFAULT_WHAT_WE_DO_CARDS),
  };
  return merged;
}
