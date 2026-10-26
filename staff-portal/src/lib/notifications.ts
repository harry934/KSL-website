import { createAdminClient } from "@/lib/supabase/admin";
import type { ModuleKey } from "@/lib/modules";
import type { StaffSession } from "@/lib/session";

const MARK_LIMIT = 80;

export type NoticeItem = {
  id: string;
  kind: "message" | "request";
  module: ModuleKey | null;
  who: string;
  text: string;
  area: string | null;
  href: string;
  createdAt: string;
  unread?: boolean;
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
    };
  });
}

/** Website messages, plus account requests for an administrator. */
export async function loadNotifications(session: StaffSession): Promise<NoticeItem[]> {
  const [messages, requests] = await Promise.all([
    loadMessages(session),
    session.isSuperAdmin ? loadAccountRequests() : Promise.resolve([]),
  ]);
  return [...requests, ...messages].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
