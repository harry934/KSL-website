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

const data = JSON.parse(readFileSync(resolve(__dirname, "../../data/products.json"), "utf8"));

const { error: settingsError } = await admin.from("products_settings").upsert({
  id: "default",
  kicker: data.kicker ?? null,
  title: data.title ?? null,
  intro: data.intro ?? null,
  catalogue_url: data.catalogueUrl ?? null,
  range_kicker: data.rangeKicker ?? null,
  range_title: data.rangeTitle ?? null,
  range_groups: data.rangeGroups ?? [],
});
if (settingsError) throw settingsError;

let order = 0;
for (const item of data.items ?? []) {
  const { error } = await admin.from("products").upsert(
    {
      slug: item.slug,
      name: item.name,
      category: item.category,
      category_label: item.categoryLabel ?? null,
      eyebrow: item.eyebrow ?? null,
      image_path: item.image ?? null,
      image_alt: item.imageAlt ?? null,
      key_specs: item.keySpecs ?? [],
      extra_specs: item.extraSpecs ?? [],
      sort_order: order++,
      status: "published",
    },
    { onConflict: "slug" }
  );
  if (error) throw error;
}

console.log("Products import complete (" + (data.items?.length ?? 0) + " items)");
