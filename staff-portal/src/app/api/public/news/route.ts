import { createAdminClient } from "@/lib/supabase/admin";
import { toPublicNewsItem } from "@/lib/news";
import { NextResponse } from "next/server";

export async function GET() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("news_items")
    .select("*")
    .eq("status", "published")
    .order("published_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    { items: (data ?? []).map(toPublicNewsItem) },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}
