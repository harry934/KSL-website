import { createAdminClient } from "@/lib/supabase/admin";
import type { ModuleKey } from "@/lib/modules";
import type { StaffSession } from "@/lib/session";

const MARK_LIMIT = 80;

export type NoticeItem = {
  id: string;
  kind: "message";
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

/** The bell is for website messages only. Edits stay on the audit log. */
export async function loadNotifications(session: StaffSession): Promise<NoticeItem[]> {
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
