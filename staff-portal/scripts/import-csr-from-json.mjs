import { readFileSync } from "node:fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createDatabaseAdmin } from "./database.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const admin = createDatabaseAdmin();

const data = JSON.parse(readFileSync(resolve(__dirname, "../../data/csr.json"), "utf8"));

const { error: settingsError } = await admin.from("csr_settings").upsert({
  id: "default",
  kicker: data.kicker ?? null,
  title: data.title ?? null,
  tagline: data.tagline ?? null,
  intro: data.intro ?? null,
  badges: data.badges ?? [],
  hero_images: data.heroImages ?? [],
  stats: data.stats ?? [],
  footnote: data.footnote ?? null,
  programmes_title: data.programmesTitle ?? null,
  programmes_intro: data.programmesIntro ?? null,
});
if (settingsError) throw settingsError;

let order = 0;
for (const item of data.programmes ?? []) {
  const { error } = await admin.from("csr_projects").upsert(
    {
      slug: item.slug,
      title: item.title,
      summary: item.summary ?? null,
      image_path: item.image ?? null,
      image_alt: item.imageAlt ?? null,
      location: item.location ?? null,
      event_date: item.date || null,
      sort_order: order++,
      status: "published",
    },
    { onConflict: "slug" }
  );
  if (error) throw error;
}

console.log("CSR import complete (" + (data.programmes?.length ?? 0) + " programmes)");
