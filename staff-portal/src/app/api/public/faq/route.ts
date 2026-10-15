import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/** Public read-only FAQ feed (same shape as data/faq.json groups). */
export async function GET() {
  const admin = createAdminClient();
  const { data: groups } = await admin
    .from("faq_groups")
    .select("id, title, sort_order")
    .eq("status", "published")
    .order("sort_order");

  const { data: items } = await admin
    .from("faq_items")
    .select("group_id, question, answer, sort_order")
    .eq("status", "published")
    .order("sort_order");

  const byGroup = new Map<string, { q: string; a: string }[]>();
  for (const item of items ?? []) {
    const list = byGroup.get(item.group_id) ?? [];
    list.push({ q: item.question, a: item.answer });
    byGroup.set(item.group_id, list);
  }

  const payload = {
    groups: (groups ?? []).map((g) => ({
      id: g.id,
      title: g.title,
      items: byGroup.get(g.id) ?? [],
    })),
  };

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
