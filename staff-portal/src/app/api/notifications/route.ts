import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffSession } from "@/lib/session";
import { describeActivity } from "@/lib/activity-words";
import { MODULE_LABELS, MODULE_ROUTES, type ModuleKey } from "@/lib/modules";

type Row = {
  id: string;
  module_key: string | null;
  action: string;
  entity_type: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  admin_profiles: { display_name: string; username: string } | null;
};

/** Recent changes made by other staff in the sections the signed-in person can see. */
export async function GET() {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const visible = session.isSuperAdmin
    ? (Object.keys(MODULE_ROUTES) as ModuleKey[])
    : session.permissions.filter((p) => p.can_view).map((p) => p.module_key);
  if (!visible.length) return NextResponse.json({ items: [] });

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await createAdminClient()
    .from("activity_log")
    .select("id, module_key, action, entity_type, metadata, created_at, admin_profiles(display_name, username)")
    .neq("actor_id", session.userId)
    .neq("action", "sign in")
    .in("module_key", visible)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20);

  const items = ((data ?? []) as unknown as Row[]).map((row) => {
    const key = row.module_key as ModuleKey | null;
    const known = key && key in MODULE_ROUTES;
    return {
      id: row.id,
      who: row.admin_profiles?.display_name || "Someone",
      text: describeActivity(row),
      area: known && key !== "staff" ? MODULE_LABELS[key] : null,
      href: known && visible.includes(key) ? MODULE_ROUTES[key] : "/",
      createdAt: row.created_at,
    };
  });

  return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
}
