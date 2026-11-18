import { readFileSync } from "node:fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createDatabaseAdmin } from "./database.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const admin = createDatabaseAdmin();

const eventsPath = resolve(__dirname, "../../data/events.json");
const data = JSON.parse(readFileSync(eventsPath, "utf8"));

function rowFrom(item) {
  return {
    slug: item.slug,
    title: item.title,
    theme: item.theme ?? null,
    event_date: item.date,
    time_start: item.timeStart ?? null,
    time_end: item.timeEnd ?? null,
    timezone: item.timezone ?? "Africa/Nairobi",
    venue: item.venue ?? null,
    description: item.description ?? null,
    summary: item.summary ?? null,
    image_path: item.image ?? null,
    body_html: item.body ?? null,
    status: "published",
    published_at: item.date ? new Date(item.date + "T12:00:00").toISOString() : new Date().toISOString(),
  };
}

for (const item of [...(data.upcoming ?? []), ...(data.past ?? [])]) {
  await admin.from("event_items").upsert(rowFrom(item), { onConflict: "slug" });
}

console.log("Events import complete");
