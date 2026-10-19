import { createAdminClient } from "@/lib/supabase/admin";
import { toPublicCareersPayload, type CareerListingRow, type CareersSettings } from "@/lib/careers";
import { NextResponse } from "next/server";

export async function GET() {
  const admin = createAdminClient();
  const [settingsRes, listingsRes] = await Promise.all([
    admin.from("careers_settings").select("apply_email, apply_note").eq("id", "default").maybeSingle(),
    admin.from("career_listings").select("*").eq("status", "published").order("sort_order", { ascending: true }),
  ]);

  if (settingsRes.error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });
  if (listingsRes.error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });

  const payload = toPublicCareersPayload(
    settingsRes.data as CareersSettings | null,
    (listingsRes.data ?? []) as CareerListingRow[]
  );

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
