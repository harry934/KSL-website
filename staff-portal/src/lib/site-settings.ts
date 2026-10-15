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

export type BannerStyle = "navy" | "gold" | "light";

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
};

export const SITE_SETTING_KEYS = ["contact", "social", "footer", "announcement"] as const;
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
    style: "navy",
    scroll: false,
    endsOn: "",
  },
};

export function mergeSiteSettings(rows: { key: string; value: unknown }[]): SiteSettings {
  const merged: SiteSettings = structuredClone(DEFAULT_SITE_SETTINGS);
  for (const row of rows) {
    if (!(SITE_SETTING_KEYS as readonly string[]).includes(row.key)) continue;
    const key = row.key as SiteSettingKey;
    merged[key] = { ...merged[key], ...(row.value as object) } as never;
  }
  return merged;
}
