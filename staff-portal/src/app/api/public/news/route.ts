import { createAdminClient } from "@/lib/supabase/admin";
import { toPublicNewsItem } from "@/lib/news";
import { nairobiToday } from "@/lib/dates";
import { NextResponse } from "next/server";

export async function GET() {
  const admin = createAdminClient();
  const today = nairobiToday();
  const { data, error } = await admin
    .from("news_items")
    .select("*")
    .eq("status", "published")
    .or(`go_live_on.is.null,go_live_on.lte.${today}`)
    .order("published_date", { ascending: false });

  if (error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });

  const live = (data ?? []).filter((row) => !row.go_live_on || String(row.go_live_on).slice(0, 10) <= today);
  return NextResponse.json(
    { items: live.map(toPublicNewsItem) },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}
