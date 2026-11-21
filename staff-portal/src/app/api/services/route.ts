import { createDatabaseClient } from "@/lib/db-client";
import { requireStaff, logActivity, dbError } from "@/lib/api-auth";
import { clearReviewDraft, editorSavePlan, overlayDrafts, overlaySettings, saveBody } from "@/lib/draft-review";
import { cleanModalActions, cleanOptionalAction, DEFAULT_SERVICE_MODAL_ACTIONS, slugify, type ServiceModalActions } from "@/lib/services";
import { cleanGroupOrder, rememberGroup } from "@/lib/group-order";
import { applyBinDelete, restoreRow, splitRemoved } from "@/lib/recycle";
import { releaseUnusedValues, rememberFiles } from "@/lib/storage-files";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireStaff("services", "view");
  if (error) return error;

  const admin = createDatabaseClient();
  const [settingsRes, itemsRes] = await Promise.all([
    admin.from("services_settings").select("*").eq("id", "default").maybeSingle(),
    admin.from("service_items").select("*").order("sort_order", { ascending: true }),
  ]);

  if (settingsRes.error) return NextResponse.json({ error: settingsRes.error.message }, { status: 500 });
  if (itemsRes.error) return NextResponse.json({ error: itemsRes.error.message }, { status: 500 });

  const split = splitRemoved(itemsRes.data ?? []);
  const settings = await overlaySettings(admin, "services_settings", "default", settingsRes.data);
  const groups = await overlaySettings(admin, "services_settings", "groups", {
    group_order: Array.isArray(settingsRes.data?.group_order) ? settingsRes.data.group_order : [],
  });
  return NextResponse.json({
    intro: settings?.intro ?? "",
    download_catalog: settings?.download_catalog ?? {},
    modal_actions: cleanModalActions(settings?.modal_actions ?? settingsRes.data?.modal_actions),
    group_order: Array.isArray(groups?.group_order) ? groups.group_order : [],
    items: await overlayDrafts(admin, "service_items", split.items),
    removed: split.removed,
  });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireStaff("services", "edit");
  if (error || !session) return error;

  const body = await req.json();
  const admin = createDatabaseClient();
  if (body.action === "restore") {
    const { error: restoreErr } = await restoreRow(admin, "service_items", String(body.id ?? ""));
    if (restoreErr) return NextResponse.json({ error: dbError(restoreErr) }, { status: 500 });
    await logActivity(session.userId, "services", "restore", "service_item", String(body.id ?? ""));
    return NextResponse.json({ ok: true });
  }
  if (body.scope === "groups") {
    const plan = await editorSavePlan(admin, session, "services", "services_settings", {
      settings: true,
      key: "groups",
      title: "Service group order",
      payload: body,
    });
    if (plan.held) return plan.held;
    const group_order = cleanGroupOrder(body.group_order);
    const { error: upErr } = await admin.from("services_settings").upsert({ id: "default", group_order });
    if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
    await clearReviewDraft(admin, "services_settings", null, "groups");
    await logActivity(session.userId, "services", "reorder", "services_settings", "groups");
    return NextResponse.json(saveBody(session, "services"));
  }

  if (body.scope === "settings") {
    const plan = await editorSavePlan(admin, session, "services", "services_settings", {
      settings: true,
      key: "default",
      title: "Services page settings",
      payload: body,
    });
    if (plan.held) return plan.held;
    const existing = await admin.from("services_settings").select("intro, download_catalog, modal_actions").eq("id", "default").maybeSingle();
    const row = {
      id: "default",
      intro: body.intro ?? existing.data?.intro ?? "",
      download_catalog: body.download_catalog ?? existing.data?.download_catalog ?? {},
      modal_actions: body.modal_actions
        ? cleanModalActions(body.modal_actions)
        : cleanModalActions(existing.data?.modal_actions ?? DEFAULT_SERVICE_MODAL_ACTIONS),
    };
    let { error: upErr } = await admin.from("services_settings").upsert(row);
    // Older databases may not have migration 006 yet — still save intro/documents.
    if (upErr && /modal_actions/i.test(String(upErr.message || upErr.code || ""))) {
      const { modal_actions: _unused, ...withoutActions } = row;
      ({ error: upErr } = await admin.from("services_settings").upsert(withoutActions));
      if (!upErr && body.force_modal_actions) {
        return NextResponse.json({
          error: "Popup buttons need database migration 006_service_modal_actions. On the VPS run: cd staff-portal && npm run db:migrate",
        }, { status: 500 });
      }
    }
    if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
    await clearReviewDraft(admin, "services_settings", null, "default");
    await logActivity(session.userId, "services", "upsert", "services_settings", "default");
    return NextResponse.json(saveBody(session, "services"));
  }

  const plan = await editorSavePlan(admin, session, "services", "service_items", {
    id: body.id,
    requestedStatus: body.status ?? "draft",
    title: String(body.title ?? "Untitled service"),
    payload: body,
  });
  if (plan.held) return plan.held;
  const slug = (body.slug || slugify(body.title || "service")).trim();
  const status = plan.status;
  const actions: ServiceModalActions | null =
    body.actions && typeof body.actions === "object"
      ? {
          primary: cleanOptionalAction((body.actions as ServiceModalActions).primary),
          secondary: cleanOptionalAction((body.actions as ServiceModalActions).secondary),
          tertiary: cleanOptionalAction((body.actions as ServiceModalActions).tertiary),
        }
      : body.actions === null
        ? null
        : undefined;

  const row: Record<string, unknown> = {
    id: body.id || crypto.randomUUID(),
    slug,
    category: String(body.category ?? "").trim() || null,
    title: body.title,
    excerpt: body.excerpt ?? null,
    detail: body.detail ?? null,
    image_path: body.image_path ?? null,
    downloads: Array.isArray(body.downloads) ? body.downloads : [],
    source_popup_id: body.source_popup_id ?? null,
    sort_order: body.sort_order ?? 0,
    status,
    updated_by: session.userId,
  };
  if (actions !== undefined) row.actions = actions;

  const previous = await rememberFiles(admin, "service_items", body.id, ["image_path"]);
  let { data, error: upErr } = await admin.from("service_items").upsert(row).select("id").single();
  if (upErr && /actions/i.test(String(upErr.message || upErr.code || ""))) {
    const { actions: _a, ...withoutActions } = row;
    ({ data, error: upErr } = await admin.from("service_items").upsert(withoutActions).select("id").single());
    if (!upErr && actions !== undefined) {
      return NextResponse.json({
        error: "Popup buttons need database migration 007_popup_actions_optional. On the VPS run: cd staff-portal && npm run db:migrate",
      }, { status: 500 });
    }
  }
  if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
  if (row.category) await rememberGroup(admin, "services_settings", row.category);
  await releaseUnusedValues(admin, previous);
  await clearReviewDraft(admin, "service_items", data?.id);
  await logActivity(session.userId, "services", "upsert", "service_item", data?.id ?? slug);
  return NextResponse.json(saveBody(session, "services", { id: data?.id }));
}

export async function DELETE(req: NextRequest) {
  const { error, session } = await requireStaff("services", "delete");
  if (error || !session) return error;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Nothing was selected." }, { status: 400 });

  const permanent = new URL(req.url).searchParams.get("permanent") === "1";
  const admin = createDatabaseClient();
  const { error: delErr } = await applyBinDelete(admin, "service_items", id, permanent);
  if (delErr?.code === "bin") return NextResponse.json({ error: delErr.message }, { status: 400 });
  if (delErr) return NextResponse.json({ error: dbError(delErr) }, { status: 500 });
  await clearReviewDraft(admin, "service_items", id);
  await logActivity(session.userId, "services", "purge", "service_item", id);
  return NextResponse.json({ ok: true });
}
