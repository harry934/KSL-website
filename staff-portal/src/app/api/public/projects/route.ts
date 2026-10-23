import { createAdminClient } from "@/lib/supabase/admin";
import { toPublicProjects, type ProjectRow } from "@/lib/projects";
import { signPayload } from "@/lib/stored-file";
import { kept } from "@/lib/recycle";
import { NextResponse } from "next/server";

export async function GET() {
  const admin = createAdminClient();
  const { data, error } = await admin.from("projects").select("*").eq("status", "published").order("sort_order", { ascending: true });
  if (error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });

  const payload = await signPayload(admin, toPublicProjects(kept((data ?? []) as Array<ProjectRow & { deleted_at?: string | null }>)));
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
