export type CsrStat = { value: string; label: string };
export type CsrImage = { src: string; alt: string };

export type CsrProjectRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  image_path: string | null;
  image_alt: string | null;
  location: string | null;
  event_date: string | null;
  sort_order: number;
  status: string;
};

export type CsrSettings = {
  kicker: string | null;
  title: string | null;
  tagline: string | null;
  intro: string | null;
  badges: string[];
  hero_images: CsrImage[];
  stats: CsrStat[];
  footnote: string | null;
  programmes_title: string | null;
  programmes_intro: string | null;
};

export function toPublicCsrPayload(settings: CsrSettings | null, rows: CsrProjectRow[]) {
  return {
    kicker: settings?.kicker ?? "",
    title: settings?.title ?? "",
    tagline: settings?.tagline ?? "",
    intro: settings?.intro ?? "",
    badges: settings?.badges ?? [],
    heroImages: settings?.hero_images ?? [],
    stats: settings?.stats ?? [],
    footnote: settings?.footnote ?? "",
    programmesTitle: settings?.programmes_title ?? "",
    programmesIntro: settings?.programmes_intro ?? "",
    programmes: rows
      .filter((row) => row.status === "published")
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((row) => ({
        slug: row.slug,
        title: row.title,
        summary: row.summary ?? "",
        image: row.image_path ?? "",
        imageAlt: row.image_alt ?? row.title,
        location: row.location ?? "",
        date: row.event_date ?? "",
      })),
  };
}
