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

export type SiteSettings = {
  contact: ContactSettings;
  social: SocialSettings;
  footer: FooterSettings;
  announcement: AnnouncementSettings;
  appearance: AppearanceSettings;
  maintenance: MaintenanceSettings;
};

export const SITE_SETTING_KEYS = ["contact", "social", "footer", "announcement", "appearance", "maintenance"] as const;
export type SiteSettingKey = (typeof SITE_SETTING_KEYS)[number];

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
  return merged;
}
