import { createDatabaseClient } from "@/lib/db-client";
import {
  DEFAULT_WHAT_WE_DO_CARDS,
  mergeSiteSettings,
  whatWeDoCardFromRow,
  type WhatWeDoItemRow,
} from "@/lib/site-settings";
import { NextResponse } from "next/server";
import { signPayload } from "@/lib/stored-file";
import { PUBLIC_CMS_CACHE } from "@/lib/public-cache";

export async function GET() {
  const admin = createDatabaseClient();
  const { data, error } = await admin.from("site_settings").select("key, value").eq("status", "published");
  if (error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });

  const settings = mergeSiteSettings(data ?? []);
  const { data: cards } = await admin
    .from("home_what_we_do_items")
    .select("*")
    .eq("status", "published")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  if (cards?.length) {
    settings.what_we_do = {
      label: settings.what_we_do.label,
      cards: (cards as WhatWeDoItemRow[]).map(whatWeDoCardFromRow),
    };
  } else if (!settings.what_we_do.cards.length) {
    settings.what_we_do.cards = structuredClone(DEFAULT_WHAT_WE_DO_CARDS);
  }

  return NextResponse.json(await signPayload(settings), {
    headers: { "Cache-Control": PUBLIC_CMS_CACHE },
  });
}
