import { readFileSync } from "node:fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createDatabaseAdmin } from "./database.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const admin = createDatabaseAdmin();

const faqPath = resolve(__dirname, "../../data/faq.json");
const data = JSON.parse(readFileSync(faqPath, "utf8"));

let order = 0;
for (const group of data.groups ?? []) {
  await admin.from("faq_groups").upsert({
    id: group.id,
    title: group.title,
    sort_order: order++,
    status: "published",
  });
  let i = 0;
  for (const item of group.items ?? []) {
    await admin.from("faq_items").upsert({
      id: crypto.randomUUID(),
      group_id: group.id,
      question: item.q,
      answer: item.a,
      sort_order: i++,
      status: "published",
    });
  }
}

console.log("FAQ import complete");
