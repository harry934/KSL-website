import { readFileSync } from "node:fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createDatabaseAdmin } from "./database.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const admin = createDatabaseAdmin();

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
