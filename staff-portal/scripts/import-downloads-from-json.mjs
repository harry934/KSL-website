import { readFileSync } from "node:fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createDatabaseAdmin } from "./database.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const admin = createDatabaseAdmin();

const downloadsPath = resolve(__dirname, "../../data/downloads.json");
const data = JSON.parse(readFileSync(downloadsPath, "utf8"));

await admin.from("downloads_settings").upsert({
  id: "default",
  base_url: data.baseUrl ?? null,
});

let order = 0;
for (const item of data.items ?? []) {
  await admin.from("download_items").upsert(
    {
      id: item.id,
      title: item.title,
      subtitle: item.subtitle ?? null,
      category: item.category,
      category_label: item.categoryLabel,
      language: item.language ?? null,
      doc_date: item.date ?? null,
      file_type: item.type ?? null,
      file_name: item.file || item.filename || null,
      anchor: item.anchor ?? null,
      alias_of: item.aliasOf ?? null,
      external_href: item.href ?? null,
      sort_order: order++,
      status: "published",
    },
    { onConflict: "id" }
  );
}

console.log("Downloads import complete (" + (data.items?.length ?? 0) + " items)");
