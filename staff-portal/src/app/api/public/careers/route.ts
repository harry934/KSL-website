import { createDatabaseClient } from "@/lib/db-client";
import { toPublicCareersPayload, type CareerListingRow, type CareersSettings } from "@/lib/careers";
import { kept } from "@/lib/recycle";
import { NextResponse } from "next/server";
import { PUBLIC_CMS_CACHE } from "@/lib/public-cache";

export async function GET() {
  const admin = createDatabaseClient();
  const [settingsRes, listingsRes] = await Promise.all([
    admin.from("careers_settings").select("apply_email, apply_note").eq("id", "default").maybeSingle(),
    admin.from("career_listings").select("*").eq("status", "published").order("sort_order", { ascending: true }),
  ]);

  if (settingsRes.error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });
  if (listingsRes.error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });

  const payload = toPublicCareersPayload(
    settingsRes.data as CareersSettings | null,
    kept((listingsRes.data ?? []) as Array<CareerListingRow & { deleted_at?: string | null }>)
  );

  return NextResponse.json(payload, {
    headers: { "Cache-Control": PUBLIC_CMS_CACHE },
  });
}
