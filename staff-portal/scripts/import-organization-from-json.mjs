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
