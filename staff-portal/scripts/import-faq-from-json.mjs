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
