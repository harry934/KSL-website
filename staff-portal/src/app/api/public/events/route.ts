import { createAdminClient } from "@/lib/supabase/admin";
import { splitEventsByDate, type EventRow } from "@/lib/events";
import { nairobiToday } from "@/lib/dates";
import { NextResponse } from "next/server";

export async function GET() {
  const admin = createAdminClient();
  const today = nairobiToday();
  let { data, error } = await admin.from("event_items").select("*").eq("status", "published").is("deleted_at", null);
  if (error) {
    const again = await admin.from("event_items").select("*").eq("status", "published");
    data = again.data;
    error = again.error;
  }

  if (error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });

  const live = ((data ?? []) as EventRow[]).filter(
    (row) => !row.go_live_on || String(row.go_live_on).slice(0, 10) <= today
  );
  const split = splitEventsByDate(live, today);
  const payload = { upcoming: split.upcoming, past: [] };

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
