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
