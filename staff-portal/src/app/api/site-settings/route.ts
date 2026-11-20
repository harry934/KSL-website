import { createDatabaseClient } from "@/lib/db-client";
import { requireStaff, logActivity, dbError } from "@/lib/api-auth";
import { clearReviewDraft, editorSavePlan, saveBody } from "@/lib/draft-review";
import {
  mergeSiteSettings,
  normalizeAnnouncement,
  normalizeMaintenance,
  normalizeWhatWeDo,
  SITE_SETTING_KEYS,
  type AnnouncementSettings,
  type SiteSettingKey,
} from "@/lib/site-settings";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireStaff("site_settings", "view");
  if (error) return error;

  const admin = createDatabaseClient();
  const { data, error: loadErr } = await admin.from("site_settings").select("key, value, updated_at");
  if (loadErr) return NextResponse.json({ error: dbError(loadErr) }, { status: 500 });
  const { data: drafts } = await admin.from("content_drafts").select("entity_key, payload").eq("entity_table", "site_settings").is("entity_id", null);
  const rows = data ?? [];
  for (const draft of drafts ?? []) {
    const payload = draft.payload as { value?: unknown } | null;
    if (!payload || typeof payload !== "object" || !("value" in payload)) continue;
    const key = String(draft.entity_key ?? "");
    const existing = rows.find((row) => row.key === key);
    if (existing) existing.value = payload.value;
    else rows.push({ key, value: payload.value, updated_at: null });
  }
  return NextResponse.json({ settings: mergeSiteSettings(rows), pending: (drafts ?? []).length > 0 });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireStaff("site_settings", "edit");
  if (error || !session) return error;
  const body = await req.json().catch(() => ({}));
  const key = String(body.key ?? "") as SiteSettingKey;
  if (!SITE_SETTING_KEYS.includes(key) || typeof body.value !== "object" || body.value === null) {
    return NextResponse.json({ error: "Invalid setting" }, { status: 400 });
  }

  const hasQueue = key === "announcement" && Array.isArray((body.value as AnnouncementSettings).queue);
  const value =
    key === "announcement"
      ? normalizeAnnouncement(body.value as AnnouncementSettings, hasQueue)
      : key === "maintenance"
        ? normalizeMaintenance(body.value)
        : key === "what_we_do"
          ? normalizeWhatWeDo(body.value)
          : body.value;
  const admin = createDatabaseClient();
  const plan = await editorSavePlan(admin, session, "site_settings", "site_settings", {
    settings: true,
    key,
    title:
      key === "announcement"
        ? "Banner"
        : key === "maintenance"
          ? "Maintenance"
          : key === "what_we_do"
            ? "What we do"
            : "Site settings",
    payload: { key, value },
  });
  if (plan.held) return plan.held;

  const { error: upErr } = await admin.from("site_settings").upsert(
    {
      key,
      value,
      status: "published",
      updated_by: session.userId,
    },
    { onConflict: "key" },
  );
  if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
  await clearReviewDraft(admin, "site_settings", null, key);

  await logActivity(session.userId, "site_settings", "update", "site_setting", key);
  return NextResponse.json(saveBody(session, "site_settings"));
}
