import { createDatabaseClient } from "@/lib/db-client";
import { toPublicProductsPayload, type ProductRow, type ProductsSettings } from "@/lib/products";
import { signPayload } from "@/lib/stored-file";
import { kept } from "@/lib/recycle";
import { NextResponse } from "next/server";

export async function GET() {
  const admin = createDatabaseClient();
  const [settingsRes, itemsRes] = await Promise.all([
    admin.from("products_settings").select("*").eq("id", "default").maybeSingle(),
    admin.from("products").select("*").eq("status", "published").order("sort_order", { ascending: true }),
  ]);
  if (settingsRes.error || itemsRes.error) {
    return NextResponse.json({ error: "Unavailable" }, { status: 500 });
  }

  const payload = await signPayload(
    toPublicProductsPayload(settingsRes.data as ProductsSettings | null, kept((itemsRes.data ?? []) as Array<ProductRow & { deleted_at?: string | null }>))
  );
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
