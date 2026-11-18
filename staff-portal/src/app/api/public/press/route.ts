import { createDatabaseClient } from "@/lib/db-client";
import { toPublicPress, type PressAssetRow, type PressSettings } from "@/lib/press";
import { openStoredUrl } from "@/lib/stored-file";
import { kept } from "@/lib/recycle";
import { NextResponse } from "next/server";

export async function GET() {
  const admin = createDatabaseClient();
  const [settingsRes, assetsRes] = await Promise.all([
    admin.from("press_settings").select("boilerplate, contact_email, contact_phone").eq("id", "default").maybeSingle(),
    admin.from("press_assets").select("*").eq("status", "published").order("sort_order", { ascending: true }),
  ]);

  if (settingsRes.error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });
  if (assetsRes.error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });

  const assets = kept((assetsRes.data ?? []) as Array<PressAssetRow & { deleted_at?: string | null }>);
  const publicAssets = await Promise.all(assets.map(async (asset) => ({
    ...asset,
    href: asset.href ? await openStoredUrl(asset.href) || null : null,
  })));
  const payload = toPublicPress(settingsRes.data as PressSettings | null, publicAssets);

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
