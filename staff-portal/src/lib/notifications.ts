import { createAdminClient } from "@/lib/supabase/admin";
import { describeActivity } from "@/lib/activity-words";
import { activityPlace } from "@/lib/activity-place";
import { MODULE_LABELS, type ModuleKey } from "@/lib/modules";
import type { StaffSession } from "@/lib/session";
import type { NotificationIcon, NotificationTone } from "@/components/ui/notification-center";

const MARK_LIMIT = 80;

export type NoticeItem = {
  id: string;
  kind: "message" | "request" | "watch";
  module: ModuleKey | null;
  who: string;
  text: string;
  area: string | null;
  href: string;
  createdAt: string;
  unread?: boolean;
  icon: NotificationIcon;
  tone: NotificationTone;
  source: string;
  time?: string;
  /** Sidebar count. Only deletes are pinned, and only on the recycle bin. */
  pin?: "recycle";
};

type MessageRow = {
  id: string;
  first_name: string;
  surname: string;
  subject: string;
  created_at: string;
  read_at: string | null;
  deleted_at?: string | null;
};

function canSeeMessages(session: StaffSession) {
  if (session.isSuperAdmin) return true;
  return session.permissions.some((item) => item.module_key === "messages" && item.can_view);
}

async function loadMessages(session: StaffSession): Promise<NoticeItem[]> {
  if (!canSeeMessages(session)) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from("website_messages")
    .select("id, first_name, surname, subject, created_at, read_at, deleted_at")
    .order("created_at", { ascending: false })
    .limit(MARK_LIMIT);

  return ((data ?? []) as MessageRow[]).filter((row) => !row.deleted_at).map((row) => ({
    id: `message:${row.id}`,
    kind: "message" as const,
    module: "messages" as const,
    who: [row.first_name, row.surname].filter(Boolean).join(" ") || "Website visitor",
    text: row.subject || "Sent a message from the website",
    area: "Messages",
    href: `/messages?id=${row.id}`,
    createdAt: row.created_at,
    unread: !row.read_at,
    icon: "message" as const,
    tone: "info" as const,
    source: "Message",
  }));
}

type RequestRow = {
  id: string;
  user_id: string;
  kind: "username" | "password";
  requested_username: string | null;
  created_at: string;
};

/** Pending username and password requests. Only administrators are told. */
async function loadAccountRequests(): Promise<NoticeItem[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("staff_account_requests")
    .select("id, user_id, kind, requested_username, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(40);
  const rows = (data ?? []) as RequestRow[];
  if (!rows.length) return [];

  const ids = [...new Set(rows.map((row) => row.user_id))];
  const { data: profiles } = await admin.from("admin_profiles").select("id, display_name, username").in("id", ids);
  const byId = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  return rows.map((row) => {
    const profile = byId.get(row.user_id);
    const who = profile?.display_name || profile?.username || "A staff member";
    const username = row.kind === "username";
    return {
      id: `request:${row.id}:${row.created_at}`,
      kind: "request" as const,
      module: "staff" as const,
      who,
      text: username
        ? `Asked to sign in as @${row.requested_username}.`
        : "Asked for a new password. Approve it before they can change it.",
      area: "Staff",
      href: "/staff",
      createdAt: row.created_at,
      icon: username ? ("username" as const) : ("password" as const),
      tone: username ? ("info" as const) : ("warning" as const),
      source: username ? "Username" : "Password change",
    };
  });
}

type ActivityRow = {
  id: string;
  actor_id: string | null;
  module_key: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  admin_profiles: { display_name: string | null; username: string | null } | { display_name: string | null; username: string | null }[] | null;
};

function personName(row: ActivityRow) {
  const profile = Array.isArray(row.admin_profiles) ? row.admin_profiles[0] : row.admin_profiles;
  return profile?.display_name || profile?.username || "A staff member";
}

function moduleKey(value: string | null): ModuleKey | null {
  if (value && value in MODULE_LABELS) return value as ModuleKey;
  return null;
}

function canSeeModule(session: StaffSession, key: ModuleKey) {
  if (session.isSuperAdmin) return true;
  if (key === "staff") return false;
  return session.permissions.some((item) => item.module_key === key && item.can_view);
}

const UPDATE_ACTIONS = [
  "upsert",
  "update",
  "save",
  "publish",
  "create",
  "restore",
  "delete",
  "purge",
  "reorder",
  "invite",
  "permissions",
  "profile",
  "set role",
  "set active",
  "approve username",
  "reject request",
  "return draft",
  "cancel invite",
  "reset password",
  "delete invite",
  "resend invite",
];

function sentence(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return "Updated something.";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1) + (trimmed.endsWith(".") ? "" : ".");
}

/** Admin changes for the bell. Deletes are also pinned to the recycle bin. */
async function loadWatches(session: StaffSession): Promise<NoticeItem[]> {
  const admin = createAdminClient();
  const since = new Date();
  since.setDate(since.getDate() - 21);
  const columns = "id, actor_id, module_key, action, entity_type, entity_id, metadata, created_at, admin_profiles(display_name, username)";
  const [{ data: updates }, { data: signIns }] = await Promise.all([
    admin
      .from("activity_log")
      .select(columns)
      .in("action", UPDATE_ACTIONS)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(40),
    admin
      .from("activity_log")
      .select(columns)
      .eq("action", "sign in")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  const rows = (updates ?? []) as ActivityRow[];
  const signInRows = (signIns ?? []) as ActivityRow[];
  const actors = [...new Set(signInRows.map((row) => row.actor_id).filter((id): id is string => Boolean(id)))];
  const firstSignIn = new Map<string, string>();
  if (actors.length && session.isSuperAdmin) {
    const { data: history } = await admin
      .from("activity_log")
      .select("id, actor_id, created_at")
      .eq("action", "sign in")
      .in("actor_id", actors)
      .order("created_at", { ascending: true });
    for (const row of history ?? []) {
      if (row.actor_id && !firstSignIn.has(row.actor_id)) firstSignIn.set(row.actor_id, row.id);
    }
  }

  const notices: NoticeItem[] = [];
  for (const row of signInRows) {
    if (!session.isSuperAdmin || !row.actor_id || row.actor_id === session.userId) continue;
    if (firstSignIn.get(row.actor_id) !== row.id) continue;
    notices.push({
      id: `watch:${row.id}`,
      kind: "watch",
      module: "staff",
      who: personName(row),
      text: "Signed in for the first time.",
      area: "Staff",
      href: "/staff",
      createdAt: row.created_at,
      icon: "username",
      tone: "info",
      source: "First sign-in",
    });
  }

  for (const row of rows) {
    const key = moduleKey(row.module_key);
    if (!key || !canSeeModule(session, key)) continue;
    const removed = row.action === "delete" || row.action === "purge";
    notices.push({
      id: `watch:${row.id}`,
      kind: "watch",
      module: key,
      who: personName(row),
      text: sentence(describeActivity({ action: row.action, entity_type: row.entity_type, metadata: row.metadata })),
      area: MODULE_LABELS[key],
      href: removed ? "/recycle" : activityPlace(row),
      createdAt: row.created_at,
      icon: removed ? "attention" : row.action === "publish" ? "scheduled" : "bell",
      tone: removed ? "danger" : row.action === "publish" ? "success" : "default",
      source: removed ? (row.action === "purge" ? "Deleted permanently" : "Deleted") : MODULE_LABELS[key],
      pin: removed ? "recycle" : undefined,
    });
  }
  return notices;
}

/** Deletes and first sign-ins, then password and username requests, then website messages. */
export async function loadNotifications(session: StaffSession): Promise<NoticeItem[]> {
  const [messages, requests, watches] = await Promise.all([
    loadMessages(session),
    session.isSuperAdmin ? loadAccountRequests() : Promise.resolve([]),
    loadWatches(session),
  ]);
  return [...watches, ...requests, ...messages].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
