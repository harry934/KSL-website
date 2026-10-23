import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, logActivity, publishGuard, dbError } from "@/lib/api-auth";
import { mergeSiteSettings, normalizeAnnouncement, SITE_SETTING_KEYS, type AnnouncementSettings, type SiteSettingKey } from "@/lib/site-settings";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireStaff("site_settings", "view");
  if (error) return error;

  const { data, error: loadErr } = await createAdminClient().from("site_settings").select("key, value, updated_at");
  if (loadErr) return NextResponse.json({ error: dbError(loadErr) }, { status: 500 });
  return NextResponse.json({ settings: mergeSiteSettings(data ?? []) });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireStaff("site_settings", "edit");
  if (error || !session) return error;
  const denied = publishGuard(session, "site_settings", "published");
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const key = String(body.key ?? "") as SiteSettingKey;
  if (!SITE_SETTING_KEYS.includes(key) || typeof body.value !== "object" || body.value === null) {
    return NextResponse.json({ error: "Invalid setting" }, { status: 400 });
  }

  const hasQueue = key === "announcement" && Array.isArray((body.value as AnnouncementSettings).queue);
  const value = key === "announcement" ? normalizeAnnouncement(body.value as AnnouncementSettings, hasQueue) : body.value;

  const { error: upErr } = await createAdminClient().from("site_settings").upsert({
    key,
    value,
    status: "published",
    updated_by: session.userId,
  });
  if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });

  await logActivity(session.userId, "site_settings", "update", "site_setting", key);
  return NextResponse.json({ ok: true });
}
