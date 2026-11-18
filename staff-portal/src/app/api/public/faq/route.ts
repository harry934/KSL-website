import { createDatabaseClient } from "@/lib/db-client";
import { kept } from "@/lib/recycle";
import { NextResponse } from "next/server";
import { signPayload } from "@/lib/stored-file";

/** Public read-only FAQ feed (same shape as data/faq.json groups). */
export async function GET() {
  const admin = createDatabaseClient();
  const { data: groups } = await admin
    .from("faq_groups")
    .select("id, title, sort_order, deleted_at")
    .eq("status", "published")
    .order("sort_order");

  const { data: items } = await admin
    .from("faq_items")
    .select("group_id, question, answer, sort_order, deleted_at")
    .eq("status", "published")
    .order("sort_order");

  const liveGroups = kept(groups ?? []);
  const liveItems = kept(items ?? []);
  const byGroup = new Map<string, { q: string; a: string }[]>();
  for (const item of liveItems) {
    const list = byGroup.get(item.group_id) ?? [];
    list.push({ q: item.question, a: item.answer });
    byGroup.set(item.group_id, list);
  }

  const payload = {
    groups: liveGroups.map((g) => ({
      id: g.id,
      title: g.title,
      items: byGroup.get(g.id) ?? [],
    })),
  };

  return NextResponse.json(await signPayload(payload), {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
