import { createDatabaseClient } from "@/lib/db-client";
import { mergeSiteSettings } from "@/lib/site-settings";
import { NextResponse } from "next/server";
import { signPayload } from "@/lib/stored-file";

export async function GET() {
  const { data, error } = await createDatabaseClient()
    .from("site_settings")
    .select("key, value")
    .eq("status", "published");
  if (error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });

  return NextResponse.json(await signPayload(mergeSiteSettings(data ?? [])), {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
