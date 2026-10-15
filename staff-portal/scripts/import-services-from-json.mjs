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

const servicesPath = resolve(__dirname, "../../data/services.json");
const data = JSON.parse(readFileSync(servicesPath, "utf8"));

await admin.from("services_settings").upsert({
  id: "default",
  intro: data.intro ?? "",
  download_catalog: data.downloadCatalog ?? {},
});

let order = 0;
for (const item of data.items ?? []) {
  await admin.from("service_items").upsert(
    {
      slug: item.slug,
      category: item.category ?? null,
      title: item.title,
      excerpt: item.excerpt ?? null,
      detail: item.detail ?? null,
      image_path: item.image ?? null,
      downloads: item.downloads ?? [],
      source_popup_id: item.sourcePopupId ?? null,
      sort_order: order++,
      status: "published",
    },
    { onConflict: "slug" }
  );
}

console.log("Services import complete (" + (data.items?.length ?? 0) + " items)");
