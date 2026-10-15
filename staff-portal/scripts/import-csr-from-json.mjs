import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
if (existsSync(envPath)) {
  const raw = readFileSync(envPath, "utf8").replace(/^\uFEFF/, "");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
}

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

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
