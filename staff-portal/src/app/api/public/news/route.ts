import { createDatabaseClient } from "@/lib/db-client";
import { toPublicNewsItem } from "@/lib/news";
import { nairobiToday } from "@/lib/dates";
import { signPayload } from "@/lib/stored-file";
import { NextResponse } from "next/server";

export async function GET() {
  const admin = createDatabaseClient();
  const today = nairobiToday();
  let { data, error } = await admin
    .from("news_items")
    .select("*")
    .eq("status", "published")
    .is("deleted_at", null)
    .or(`go_live_on.is.null,go_live_on.lte.${today}`)
    .order("published_date", { ascending: false });

  if (error) {
    const again = await admin
      .from("news_items")
      .select("*")
      .eq("status", "published")
      .or(`go_live_on.is.null,go_live_on.lte.${today}`)
      .order("published_date", { ascending: false });
    data = again.data;
    error = again.error;
  }

  if (error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });

  const live = (data ?? []).filter(
    (row) => !row.deleted_at && (!row.go_live_on || String(row.go_live_on).slice(0, 10) <= today)
  );
  return NextResponse.json(
    await signPayload({ items: live.map(toPublicNewsItem) }),
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}
