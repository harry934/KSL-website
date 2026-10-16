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

type WebsiteMessage = {
  id: string;
  first_name: string;
  surname: string;
  subject: string;
  created_at: string;
  read_at: string | null;
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

  const activity = ((data ?? []) as unknown as Row[]).map((row) => {
    const key = row.module_key as ModuleKey | null;
    const known = key && key in MODULE_ROUTES;
    return {
      id: row.id,
      kind: "activity" as const,
      who: row.admin_profiles?.display_name || "Someone",
      text: describeActivity(row),
      area: known && key !== "staff" ? MODULE_LABELS[key] : null,
      href: known && visible.includes(key) ? MODULE_ROUTES[key] : "/",
      createdAt: row.created_at,
    };
  });

  let messages: {
    id: string;
    kind: "message";
    who: string;
    text: string;
    area: string;
    href: string;
    createdAt: string;
    unread: boolean;
  }[] = [];
  if (visible.includes("messages")) {
    const { data: rows } = await createAdminClient()
      .from("website_messages")
      .select("id, first_name, surname, subject, created_at, read_at")
      .order("created_at", { ascending: false })
      .limit(20);
    messages = ((rows ?? []) as WebsiteMessage[]).map((row) => ({
      id: `message:${row.id}`,
      kind: "message" as const,
      who: [row.first_name, row.surname].filter(Boolean).join(" ") || "Website visitor",
      text: row.subject || "Sent a message from the website",
      area: "Messages",
      href: `/messages?id=${row.id}`,
      createdAt: row.created_at,
      unread: !row.read_at,
    }));
  }

  const items = [...messages, ...activity]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 20);

  return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
}
