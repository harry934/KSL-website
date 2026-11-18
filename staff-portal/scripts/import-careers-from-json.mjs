import { readFileSync } from "node:fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createDatabaseAdmin } from "./database.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const admin = createDatabaseAdmin();

const careersPath = resolve(__dirname, "../../data/careers.json");
const data = JSON.parse(readFileSync(careersPath, "utf8"));

await admin.from("careers_settings").upsert({
  id: "default",
  apply_email: data.applyEmail ?? "careers@kenyashipyards.co.ke",
  apply_note: data.applyNote ?? null,
});

let order = 0;
for (const job of data.vacancies ?? []) {
  await admin.from("career_listings").insert({
    kind: "vacancy",
    title: job.title,
    location: job.location ?? null,
    summary: job.summary ?? null,
    closing_date: job.closingDate || null,
    apply_url: job.applyUrl ?? null,
    sort_order: order++,
    status: "published",
  });
}

for (const row of data.internships ?? []) {
  await admin.from("career_listings").insert({
    kind: "internship",
    title: row.title,
    location: row.location ?? null,
    summary: row.summary ?? null,
    sort_order: order++,
    status: "published",
  });
}

console.log("Careers import complete");
