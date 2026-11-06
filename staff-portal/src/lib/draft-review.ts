import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { canAccess, MODULE_LABELS, MODULE_ROUTES, type ModuleKey, type ModulePermission } from "@/lib/modules";

type Actor = {
  userId: string;
  isSuperAdmin: boolean;
  permissions: ModulePermission[];
};

type Admin = SupabaseClient;

export type DraftSource = {
  table: string;
  module: ModuleKey;
  section: string;
  href: string;
  title: (row: Record<string, unknown>) => string;
};

function text(value: unknown, fallback: string) {
  const label = String(value ?? "").trim();
  return label || fallback;
}

/** Tables whose hidden rows are waiting to go on the website. */
export const DRAFT_SOURCES: DraftSource[] = [
  { table: "news_items", module: "news", section: "News", href: "/news", title: (row) => text(row.title, "Untitled article") },
  { table: "event_items", module: "events", section: "Events", href: "/events", title: (row) => text(row.title, "Untitled event") },
  { table: "gallery_photos", module: "gallery", section: "Gallery", href: "/gallery", title: (row) => text(row.title || row.alt_text, "Untitled photo") },
  { table: "gallery_videos", module: "gallery", section: "Gallery", href: "/gallery", title: (row) => text(row.title, "Untitled video") },
  { table: "service_items", module: "services", section: "Services", href: "/services", title: (row) => text(row.title, "Untitled service") },
  { table: "products", module: "products", section: "Products", href: "/products", title: (row) => text(row.name, "Untitled product") },
  { table: "projects", module: "projects", section: "Projects", href: "/projects", title: (row) => text(row.title, "Untitled project") },
  { table: "career_listings", module: "careers", section: "Careers", href: "/careers", title: (row) => text(row.title, "Untitled listing") },
  { table: "csr_projects", module: "csr", section: "Community (CSR)", href: "/csr", title: (row) => text(row.title, "Untitled programme") },
  { table: "download_items", module: "downloads", section: "Downloads", href: "/downloads", title: (row) => text(row.title, "Untitled document") },
  { table: "faq_groups", module: "faq", section: "Questions (FAQ)", href: "/faq", title: (row) => text(row.title, "Untitled group") },
  { table: "faq_items", module: "faq", section: "Questions (FAQ)", href: "/faq", title: (row) => text(row.question, "Untitled question") },
  { table: "press_assets", module: "press", section: "Press kit", href: "/press", title: (row) => text(row.title, "Untitled item") },
  { table: "organization_leadership", module: "organization", section: "Organisation", href: "/organization", title: (row) => text(row.role, "Leadership role") },
  { table: "organization_board_members", module: "organization", section: "Board", href: "/board", title: (row) => text(row.full_name, "Board member") },
  { table: "organization_milestones", module: "organization", section: "Organisation", href: "/organization", title: (row) => text(row.title, "Milestone") },
];

const SETTINGS_PLACES: Record<string, { module: ModuleKey; section: string; href: string }> = {
  services_settings: { module: "services", section: "Services", href: "/services" },
  products_settings: { module: "products", section: "Products", href: "/products" },
  projects_settings: { module: "projects", section: "Projects", href: "/projects" },
  careers_settings: { module: "careers", section: "Careers", href: "/careers" },
  csr_settings: { module: "csr", section: "Community (CSR)", href: "/csr" },
  press_settings: { module: "press", section: "Press kit", href: "/press" },
  downloads_settings: { module: "downloads", section: "Downloads", href: "/downloads" },
  organization_settings: { module: "organization", section: "Organisation", href: "/organization" },
  site_settings: { module: "site_settings", section: "Site settings", href: "/settings" },
  site_image_overrides: { module: "site_settings", section: "Website images", href: "/images" },
};

const SKIP_OVERLAY = new Set([
  "id",
  "updated_by",
  "updated_at",
  "deleted_at",
  "created_at",
  "published_at",
  "action",
  "scope",
  "type",
  "pending_review",
  "queued",
  "held",
]);

export type ReviewDraft = {
  id: string;
  kind: "new" | "change";
  title: string;
  section: string;
  href: string;
  author: string;
  updatedAt: string | null;
  discardId: string | null;
  note: string;
};

function heldResponse() {
  return NextResponse.json({ ok: true, held: true, queued: true });
}

export function saveBody(actor: Actor, module: ModuleKey, extra: Record<string, unknown> = {}) {
  const queued = !canAccess(actor.permissions, module, "publish", actor.isSuperAdmin);
  return { ok: true, queued, ...extra };
}

async function storeDraft(
  admin: Admin,
  row: {
    module: ModuleKey;
    table: string;
    entityId: string | null;
    entityKey: string;
    title: string;
    payload: Record<string, unknown>;
    userId: string;
  }
) {
  const saved = {
    module_key: row.module,
    entity_table: row.table,
    entity_id: row.entityId,
    entity_key: row.entityKey,
    title: row.title || "Saved changes",
    payload: row.payload,
    submitted_by: row.userId,
    updated_at: new Date().toISOString(),
  };
  let lookup = admin.from("content_drafts").select("id").eq("entity_table", row.table);
  lookup = row.entityId ? lookup.eq("entity_id", row.entityId) : lookup.is("entity_id", null).eq("entity_key", row.entityKey);
  const { data: existing, error: findErr } = await lookup.maybeSingle();
  if (findErr) return findErr.message;
  if (existing?.id) {
    const { error } = await admin.from("content_drafts").update(saved).eq("id", existing.id);
    return error?.message ?? null;
  }
  const { error } = await admin.from("content_drafts").insert(saved);
  return error?.message ?? null;
}

/** Publishers write straight away. Everyone else saves a draft, and edits to a live page stay off the website. */
export async function editorSavePlan(
  admin: Admin,
  actor: Actor,
  module: ModuleKey,
  table: string,
  args: {
    id?: string | null;
    key?: string;
    requestedStatus?: unknown;
    title: string;
    payload: Record<string, unknown>;
    settings?: boolean;
  }
): Promise<{ status: string; held: NextResponse | null }> {
  const requested = typeof args.requestedStatus === "string" && args.requestedStatus ? args.requestedStatus : "draft";
  if (canAccess(actor.permissions, module, "publish", actor.isSuperAdmin)) {
    return { status: requested, held: null };
  }

  const id = args.id ? String(args.id) : "";
  if (!args.settings && id) {
    const { data } = await admin.from(table).select("status").eq("id", id).maybeSingle();
    if (data?.status === "published") {
      const problem = await storeDraft(admin, {
        module,
        table,
        entityId: id,
        entityKey: "",
        title: args.title,
        payload: args.payload,
        userId: actor.userId,
      });
      if (problem) return { status: requested, held: NextResponse.json({ error: "Could not save the draft." }, { status: 500 }) };
      return { status: "published", held: heldResponse() };
    }
  }

  if (args.settings) {
    const problem = await storeDraft(admin, {
      module,
      table,
      entityId: null,
      entityKey: args.key || id || "default",
      title: args.title,
      payload: args.payload,
      userId: actor.userId,
    });
    if (problem) return { status: requested, held: NextResponse.json({ error: "Could not save the draft." }, { status: 500 }) };
    return { status: "draft", held: heldResponse() };
  }

  return { status: "draft", held: null };
}

export async function clearReviewDraft(admin: Admin, table: string, id?: string | null, key?: string) {
  if (id) {
    await admin.from("content_drafts").delete().eq("entity_table", table).eq("entity_id", String(id));
    return;
  }
  let query = admin.from("content_drafts").delete().eq("entity_table", table).is("entity_id", null);
  if (key) query = query.eq("entity_key", key);
  await query;
}

export async function overlayDrafts<T extends { id: string }>(admin: Admin, table: string, rows: T[]): Promise<T[]> {
  if (!rows.length) return rows;
  const ids = rows.map((row) => row.id);
  const { data } = await admin.from("content_drafts").select("entity_id, payload").eq("entity_table", table).in("entity_id", ids);
  if (!data?.length) return rows;
  const byId = new Map(data.map((row) => [String(row.entity_id), row.payload]));
  return rows.map((row) => {
    const payload = byId.get(row.id);
    if (!payload || typeof payload !== "object") return row;
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      if (SKIP_OVERLAY.has(key)) continue;
      patch[key] = value;
    }
    return { ...row, ...patch, pending_review: true };
  });
}

export async function overlaySettings<T extends Record<string, unknown> | null>(
  admin: Admin,
  table: string,
  key: string,
  settings: T
): Promise<T> {
  const { data } = await admin
    .from("content_drafts")
    .select("payload")
    .eq("entity_table", table)
    .eq("entity_key", key)
    .is("entity_id", null)
    .maybeSingle();
  if (!data?.payload || typeof data.payload !== "object") return settings;
  const patch: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(data.payload as Record<string, unknown>)) {
    if (SKIP_OVERLAY.has(field)) continue;
    patch[field] = value;
  }
  return { ...(settings ?? {}), ...patch, pending_review: true } as unknown as T;
}

type Profile = { id: string; display_name: string | null; username: string | null; is_super_admin: boolean };
type Perm = { profile_id: string; module_key: string; can_publish: boolean };

function cannotPublish(profiles: Map<string, Profile>, perms: Perm[], userId: string | null, module: string) {
  if (!userId) return true;
  const profile = profiles.get(userId);
  if (!profile) return true;
  if (profile.is_super_admin) return false;
  return !perms.some((row) => row.profile_id === userId && row.module_key === module && row.can_publish);
}

function authorName(profiles: Map<string, Profile>, userId: string | null) {
  if (!userId) return "A staff member";
  const profile = profiles.get(userId);
  return profile?.display_name || profile?.username || "A staff member";
}

export async function listReviewDrafts(admin: Admin, actor: Actor): Promise<ReviewDraft[]> {
  const [{ data: profileRows }, { data: permRows }, { data: staged }] = await Promise.all([
    admin.from("admin_profiles").select("id, display_name, username, is_super_admin"),
    admin.from("admin_module_permissions").select("profile_id, module_key, can_publish"),
    admin.from("content_drafts").select("*").order("updated_at", { ascending: false }),
  ]);
  const profiles = new Map((profileRows ?? []).map((row) => [row.id as string, row as Profile]));
  const perms = (permRows ?? []) as Perm[];
  const items: ReviewDraft[] = [];

  const tables = await Promise.all(
    DRAFT_SOURCES.map(async (source) => {
      if (!canAccess(actor.permissions, source.module, "publish", actor.isSuperAdmin)) return [];
      const { data, error } = await admin.from(source.table).select("*").eq("status", "draft");
      if (error || !data) return [];
      return data.flatMap((row) => {
        const record = row as Record<string, unknown>;
        if (record.deleted_at) return [];
        const authorId = typeof record.updated_by === "string" ? record.updated_by : null;
        if (!cannotPublish(profiles, perms, authorId, source.module)) return [];
        const id = String(record.id ?? "");
        if (!id) return [];
        return [
          {
            id: `${source.table}:${id}`,
            kind: "new" as const,
            title: source.title(record),
            section: source.section,
            href: `${source.href}?edit=${encodeURIComponent(id)}`,
            author: authorName(profiles, authorId),
            updatedAt: typeof record.updated_at === "string" ? record.updated_at : null,
            discardId: null,
            note: "Not on the website yet.",
          },
        ];
      });
    })
  );

  for (const group of tables) items.push(...group);

  for (const row of staged ?? []) {
    const moduleKey = row.module_key as ModuleKey;
    if (!canAccess(actor.permissions, moduleKey, "publish", actor.isSuperAdmin)) continue;
    const authorId = typeof row.submitted_by === "string" ? row.submitted_by : null;
    if (!cannotPublish(profiles, perms, authorId, moduleKey)) continue;
    const source = DRAFT_SOURCES.find((item) => item.table === row.entity_table);
    const place = SETTINGS_PLACES[row.entity_table as string];
    const hrefBase = source?.href || place?.href || MODULE_ROUTES[moduleKey] || "/";
    const href =
      row.entity_table === "site_settings" && row.entity_key === "announcement"
        ? "/banner"
        : row.entity_id
          ? `${hrefBase}?edit=${encodeURIComponent(String(row.entity_id))}`
          : hrefBase;
    const payload = row.payload && typeof row.payload === "object" ? (row.payload as Record<string, unknown>) : {};
    items.push({
      id: String(row.id),
      kind: "change",
      title: text(row.title, source ? source.title(payload) : "Saved changes"),
      section: source?.section || place?.section || MODULE_LABELS[moduleKey] || "Draft",
      href,
      author: authorName(profiles, authorId),
      updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
      discardId: String(row.id),
      note: "Already on the website. These changes stay hidden until you publish them.",
    });
  }

  items.sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")));
  return items;
}
