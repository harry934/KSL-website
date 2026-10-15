import { createAdminClient } from "@/lib/supabase/admin";
import { splitEventsByDate, type EventRow } from "@/lib/events";
import { NextResponse } from "next/server";

export async function GET() {
  const admin = createAdminClient();
  const { data, error } = await admin.from("event_items").select("*").eq("status", "published");

  if (error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });

  const today = new Date().toISOString().slice(0, 10);
  const payload = splitEventsByDate((data ?? []) as EventRow[], today);

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
