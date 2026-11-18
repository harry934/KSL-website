import { readFileSync } from "node:fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createDatabaseAdmin } from "./database.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const admin = createDatabaseAdmin();

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
