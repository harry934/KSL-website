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
