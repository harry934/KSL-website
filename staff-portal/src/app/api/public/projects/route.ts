import { createDatabaseClient } from "@/lib/db-client";
import { toPublicProjects, type ProjectRow } from "@/lib/projects";
import { signPayload } from "@/lib/stored-file";
import { kept } from "@/lib/recycle";
import { NextResponse } from "next/server";
import { PUBLIC_CMS_CACHE } from "@/lib/public-cache";

export async function GET() {
  const admin = createDatabaseClient();
  const [itemsRes, settingsRes] = await Promise.all([
    admin.from("projects").select("*").eq("status", "published").order("sort_order", { ascending: true }),
    admin.from("projects_settings").select("group_order, kicker, title, intro").eq("id", "default").maybeSingle(),
  ]);
  if (itemsRes.error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });

  const settings = settingsRes.data as {
    group_order?: string[] | null;
    kicker?: string | null;
    title?: string | null;
    intro?: string | null;
  } | null;
  const payload = await signPayload({
    ...toPublicProjects(kept((itemsRes.data ?? []) as Array<ProjectRow & { deleted_at?: string | null }>), settings),
    groupOrder: Array.isArray(settings?.group_order) ? settings.group_order : [],
  });
  return NextResponse.json(payload, {
    headers: { "Cache-Control": PUBLIC_CMS_CACHE },
  });
}
