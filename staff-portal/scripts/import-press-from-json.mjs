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
