import { readFileSync } from "node:fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createDatabaseAdmin } from "./database.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const admin = createDatabaseAdmin();

const pressPath = resolve(__dirname, "../../data/press.json");
const data = JSON.parse(readFileSync(pressPath, "utf8"));

await admin.from("press_settings").upsert({
  id: "default",
  boilerplate: data.boilerplate ?? null,
  contact_email: data.contactEmail ?? null,
  contact_phone: data.contactPhone ?? null,
});

let order = 0;
for (const asset of data.assets ?? []) {
  await admin.from("press_assets").insert({
    title: asset.title,
    href: asset.href ?? null,
    download_id: asset.downloadId ?? null,
    asset_type: asset.type ?? null,
    sort_order: order++,
    status: "published",
  });
}

console.log("Press import complete");
