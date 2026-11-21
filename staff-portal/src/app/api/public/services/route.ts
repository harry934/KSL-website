import { createDatabaseClient } from "@/lib/db-client";
import { toPublicServicesPayload, type ServiceRow, type ServicesSettings } from "@/lib/services";
import { openStoredUrl, signPayload } from "@/lib/stored-file";
import { kept } from "@/lib/recycle";
import { NextResponse } from "next/server";
import { PUBLIC_CMS_CACHE } from "@/lib/public-cache";

export async function GET() {
  const admin = createDatabaseClient();
  const [settingsRes, itemsRes] = await Promise.all([
    admin.from("services_settings").select("*").eq("id", "default").maybeSingle(),
    admin.from("service_items").select("*").eq("status", "published").order("sort_order", { ascending: true }),
  ]);

  if (settingsRes.error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });
  if (itemsRes.error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });

  const payload = toPublicServicesPayload(
    settingsRes.data as ServicesSettings | null,
    kept((itemsRes.data ?? []) as Array<ServiceRow & { deleted_at?: string | null }>)
  );
  // item.downloads are catalog keys (e.g. "brochure"), not file paths — do not rewrite them.
  for (const item of Object.values(payload.downloadCatalog)) {
    item.href = (await openStoredUrl(item.href)) || "";
  }
  const safePayload = await signPayload(payload);

  return NextResponse.json(safePayload, {
    headers: { "Cache-Control": PUBLIC_CMS_CACHE },
  });
}
