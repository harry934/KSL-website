import { createAdminClient } from "@/lib/supabase/admin";
import { mergeSiteSettings } from "@/lib/site-settings";
import { NextResponse } from "next/server";

export async function GET() {
  const { data, error } = await createAdminClient()
    .from("site_settings")
    .select("key, value")
    .eq("status", "published");
  if (error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });

  return NextResponse.json(mergeSiteSettings(data ?? []), {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
