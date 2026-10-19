import { createAdminClient } from "@/lib/supabase/admin";
import { describeActivity } from "@/lib/activity-words";
import { activityPlace } from "@/lib/activity-place";
import { MODULE_LABELS, MODULE_ROUTES, type ModuleKey } from "@/lib/modules";
import type { StaffSession } from "@/lib/session";

const WINDOW_DAYS = 30;
const MARK_LIMIT = 80;

export type NoticeItem = {
  id: string;
  kind: "activity" | "message";
  module: ModuleKey | null;
  who: string;
  text: string;
  area: string | null;
  href: string;
  createdAt: string;
  /** Messages stay unread until opened. Activity uses the browser's "last seen" time. */
  unread?: boolean;
};

type ActivityRow = {
  id: string;
  module_key: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  admin_profiles: { display_name: string; username: string } | null;
};

type MessageRow = {
  id: string;
  first_name: string;
  surname: string;
  subject: string;
  created_at: string;
  read_at: string | null;
};

function isModule(key: string | null): key is ModuleKey {
  return !!key && key in MODULE_ROUTES && key !== "staff";
}

function visibleModules(session: StaffSession): ModuleKey[] {
  if (session.isSuperAdmin) return (Object.keys(MODULE_ROUTES) as ModuleKey[]).filter((key) => key !== "staff");
  return session.permissions.filter((p) => p.can_view && p.module_key !== "staff").map((p) => p.module_key);
}

function toActivityItem(row: ActivityRow, visible: ModuleKey[], openAudit: boolean): NoticeItem {
  const key = isModule(row.module_key) ? row.module_key : null;
  const place = activityPlace(row);
  return {
    id: row.id,
    kind: "activity",
    module: key,
    who: row.admin_profiles?.display_name || "Someone",
    text: describeActivity(row),
    area: key ? MODULE_LABELS[key] : null,
    href: openAudit || (key && visible.includes(key)) ? place : "/",
    createdAt: row.created_at,
  };
}

/**
 * Notifications for the bell and the sidebar badges.
 * Administrators hear about every other person's changes in a section.
 * Everyone else only hears about items they themselves added or saved.
 * Sign-ins and staff-account rows are never included; those stay on the activity log.
 */
export async function loadNotifications(session: StaffSession): Promise<NoticeItem[]> {
  const visible = visibleModules(session);
  if (!visible.length) return [];

  const admin = createAdminClient();
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  let activityQuery = admin
    .from("activity_log")
    .select("id, module_key, action, entity_type, entity_id, metadata, created_at, admin_profiles(display_name, username)")
    .neq("actor_id", session.userId)
    .neq("action", "sign in")
    .in("module_key", visible)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(MARK_LIMIT);

  if (!session.isSuperAdmin) {
    const { data: mine } = await admin
      .from("activity_log")
      .select("entity_id")
      .eq("actor_id", session.userId)
      .in("action", ["create", "upsert"])
      .in("module_key", visible)
      .not("entity_id", "is", null)
      .limit(500);
    const entityIds = [...new Set((mine ?? []).map((row) => row.entity_id).filter((id): id is string => !!id))].slice(0, 150);
    activityQuery = entityIds.length ? activityQuery.in("entity_id", entityIds) : activityQuery.in("entity_id", ["-"]);
  }

  const activityPromise = activityQuery;

  const messagePromise = visible.includes("messages")
    ? admin
        .from("website_messages")
        .select("id, first_name, surname, subject, created_at, read_at")
        .order("created_at", { ascending: false })
        .limit(MARK_LIMIT)
    : Promise.resolve({ data: [] as MessageRow[] });

  const [{ data: activityRows }, { data: messageRows }] = await Promise.all([activityPromise, messagePromise]);

  const activity = ((activityRows ?? []) as unknown as ActivityRow[])
    .filter((row) => isModule(row.module_key))
    .map((row) => toActivityItem(row, visible, session.isSuperAdmin));

  const messages = ((messageRows ?? []) as MessageRow[]).map((row) => ({
    id: `message:${row.id}`,
    kind: "message" as const,
    module: "messages" as const,
    who: [row.first_name, row.surname].filter(Boolean).join(" ") || "Website visitor",
    text: row.subject || "Sent a message from the website",
    area: "Messages",
    href: `/messages?id=${row.id}`,
    createdAt: row.created_at,
    unread: !row.read_at,
  }));

  return [...messages, ...activity].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, MARK_LIMIT);
}
