import { createAdminClient } from "@/lib/supabase/admin";
import type { ModuleKey } from "@/lib/modules";
import type { StaffSession } from "@/lib/session";
import { formatDay } from "@/lib/dates";
import { loadWatchNotices } from "@/lib/watch-lists";
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

async function loadWatchItems(session: StaffSession): Promise<NoticeItem[]> {
  const notices = await loadWatchNotices(session);
  return notices.map((item) => ({
    id: item.id,
    kind: "watch" as const,
    module: item.module,
    who: item.title,
    text: item.detail,
    area: item.source,
    href: item.href,
    createdAt: `${item.day}T09:00:00+03:00`,
    icon: item.icon,
    tone: item.tone,
    source: item.source,
    time: formatDay(item.day),
  }));
}

function rank(item: NoticeItem) {
  if (item.kind === "request") return 0;
  if (item.kind === "watch") return 1;
  return 2;
}

/** Password and username requests, website dates that need attention, and messages. */
export async function loadNotifications(session: StaffSession): Promise<NoticeItem[]> {
  const [messages, requests, watches] = await Promise.all([
    loadMessages(session),
    session.isSuperAdmin ? loadAccountRequests() : Promise.resolve([]),
    loadWatchItems(session),
  ]);
  return [...requests, ...watches, ...messages].sort(
    (a, b) => rank(a) - rank(b) || (a.createdAt < b.createdAt ? 1 : -1)
  );
}
