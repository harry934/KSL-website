import { readFileSync } from "node:fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createDatabaseAdmin } from "./database.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const admin = createDatabaseAdmin();

const orgPath = resolve(__dirname, "../../data/organization.json");
const data = JSON.parse(readFileSync(orgPath, "utf8"));

await admin.from("organization_settings").upsert({
  id: "default",
  chart_download_id: data.chartDownloadId ?? null,
});

let order = 0;
for (const row of data.leadership ?? []) {
  await admin.from("organization_leadership").insert({
    role: row.role,
    summary: row.summary ?? null,
    sort_order: order++,
    status: "published",
  });
}

order = 0;
for (const yard of data.yards ?? []) {
  await admin.from("organization_yards").insert({
    name: yard.name,
    lead: yard.lead ?? null,
    summary: yard.summary ?? null,
    sort_order: order++,
    status: "published",
  });
}

console.log("Organization import complete");
