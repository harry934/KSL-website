import { createDatabaseClient } from "@/lib/db-client";
import { mergeSiteSettings } from "@/lib/site-settings";
import { NextResponse } from "next/server";
import { signPayload } from "@/lib/stored-file";
import { PUBLIC_CMS_CACHE } from "@/lib/public-cache";

export async function GET() {
  const { data, error } = await createDatabaseClient()
    .from("site_settings")
    .select("key, value")
    .eq("status", "published");
  if (error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });

  return NextResponse.json(await signPayload(mergeSiteSettings(data ?? [])), {
    headers: { "Cache-Control": PUBLIC_CMS_CACHE },
  });
}
