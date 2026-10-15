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
