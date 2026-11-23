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
  // Open the file links first, then clear them before signPayload. A signed download
  // URL is a stored-file link, and signPayload would otherwise blank it.
  const openedHrefs = new Map<string, string>();
  for (const [key, item] of Object.entries(payload.downloadCatalog)) {
    const href = typeof item?.href === "string" ? item.href : "";
    openedHrefs.set(key, (await openStoredUrl(href)) || "");
    item.href = "";
  }
  const safePayload = await signPayload(payload);
  for (const [key, href] of openedHrefs) {
    const entry = safePayload.downloadCatalog[key];
    if (entry && href) entry.href = href;
  }

  return NextResponse.json(safePayload, {
    headers: { "Cache-Control": PUBLIC_CMS_CACHE },
  });
}
