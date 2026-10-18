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

export const BANNER_DESIGNS = ["notice", "navy", "tide", "flag", "tender", "alert"] as const;

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
  "night-watch": "navy",
  "yard-bell": "navy",
  "brass-plate": "navy",
  "shipyard-stamp": "navy",
  "command-strip": "navy",
  "dry-dock": "navy",
  gold: "navy",
  forest: "navy",
  midnight: "navy",
  tide: "tide",
  flag: "flag",
  "signal-flag": "flag",
  "split-bar": "flag",
  "mast-pennant": "flag",
  kenya: "flag",
  tender: "tender",
  "tender-notice": "tender",
  alert: "alert",
  "alert-bar": "alert",
};

export function bannerDesign(value: unknown): BannerDesign {
  return BANNER_ALIASES[String(value)] || "navy";
}

export type MenuStyle = "classic" | "cards" | "soft" | "line" | "compact";

export type AppearanceSettings = {
  menuStyle: MenuStyle;
};

export type AnnouncementSettings = {
  enabled: boolean;
  label: string;
  text: string;
  linkLabel: string;
  linkUrl: string;
  style: BannerStyle;
  scroll: boolean;
  /** YYYY-MM-DD; the banner stops showing after this day. Empty means no end date. */
  endsOn: string;
};

export type SiteSettings = {
  contact: ContactSettings;
  social: SocialSettings;
  footer: FooterSettings;
  announcement: AnnouncementSettings;
  appearance: AppearanceSettings;
};

export const SITE_SETTING_KEYS = ["contact", "social", "footer", "announcement", "appearance"] as const;
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
    endsOn: "",
  },
  appearance: {
    menuStyle: "classic",
  },
};

export function mergeSiteSettings(rows: { key: string; value: unknown }[]): SiteSettings {
  const merged: SiteSettings = structuredClone(DEFAULT_SITE_SETTINGS);
  for (const row of rows) {
    if (!(SITE_SETTING_KEYS as readonly string[]).includes(row.key)) continue;
    const key = row.key as SiteSettingKey;
    merged[key] = { ...merged[key], ...(row.value as object) } as never;
  }
  merged.announcement.style = bannerDesign(merged.announcement.style);
  return merged;
}
