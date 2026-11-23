import { toPublicNewsItem, type NewsRow } from "@/lib/news";
import { nairobiToday, normalizeCalendarDay } from "@/lib/dates";
import { query } from "@/lib/db";
import { signPayload } from "@/lib/stored-file";
import { NextResponse } from "next/server";
import { PUBLIC_CMS_CACHE } from "@/lib/public-cache";

export async function GET() {
  const today = nairobiToday();
  const result = await query<NewsRow>(
    `SELECT *
     FROM news_items
     WHERE status = 'published'
       AND deleted_at IS NULL
       AND (go_live_on IS NULL OR go_live_on <= $1::date)
     ORDER BY published_date DESC NULLS LAST, published_at DESC NULLS LAST, title ASC`,
    [today],
  );

  const live = result.rows.filter((row) => {
    const goLive = normalizeCalendarDay(row.go_live_on);
    return !goLive || goLive <= today;
  });

  return NextResponse.json(
    await signPayload({ items: live.map(toPublicNewsItem) }),
    { headers: { "Cache-Control": PUBLIC_CMS_CACHE } },
  );
}