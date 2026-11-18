import { createDatabaseClient } from "@/lib/db-client";
import { toPublicProjects, type ProjectRow } from "@/lib/projects";
import { signPayload } from "@/lib/stored-file";
import { kept } from "@/lib/recycle";
import { NextResponse } from "next/server";

export async function GET() {
  const admin = createDatabaseClient();
  const [itemsRes, settingsRes] = await Promise.all([
    admin.from("projects").select("*").eq("status", "published").order("sort_order", { ascending: true }),
    admin.from("projects_settings").select("group_order").eq("id", "default").maybeSingle(),
  ]);
  if (itemsRes.error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });

  const payload = await signPayload({
    ...toPublicProjects(kept((itemsRes.data ?? []) as Array<ProjectRow & { deleted_at?: string | null }>)),
    groupOrder: Array.isArray(settingsRes.data?.group_order) ? settingsRes.data.group_order : [],
  });
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
