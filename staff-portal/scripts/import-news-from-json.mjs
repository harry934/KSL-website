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

const newsPath = resolve(__dirname, "../../data/news.json");
const data = JSON.parse(readFileSync(newsPath, "utf8"));

for (const item of data.items ?? []) {
  await admin.from("news_items").upsert({
    slug: item.slug,
    title: item.title,
    excerpt: item.excerpt ?? null,
    category: item.category ?? "News",
    published_date: item.date ?? null,
    image_path: item.image ?? null,
    author: item.author ?? null,
    location: item.location ?? null,
    body_html: item.body ?? null,
    status: "published",
    published_at: item.date ? new Date(item.date + "T12:00:00").toISOString() : new Date().toISOString(),
  }, { onConflict: "slug" });
}

console.log("News import complete");
