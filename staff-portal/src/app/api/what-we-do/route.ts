import { createDatabaseClient } from "@/lib/db-client";
import { requireStaff, logActivity, dbError } from "@/lib/api-auth";
import { applyBinDelete, restoreRow, splitRemoved } from "@/lib/recycle";
import { releaseUnusedValues, rememberFiles } from "@/lib/storage-files";
import {
  DEFAULT_WHAT_WE_DO_CARDS,
  normalizeWhatWeDo,
  normalizeWhatWeDoLabel,
  whatWeDoCardFromRow,
  whatWeDoRowFromCard,
  type WhatWeDoCard,
  type WhatWeDoItemRow,
} from "@/lib/site-settings";
import { NextRequest, NextResponse } from "next/server";

async function loadLabel(admin: ReturnType<typeof createDatabaseClient>) {
  const { data } = await admin.from("site_settings").select("value").eq("key", "what_we_do").maybeSingle();
  return normalizeWhatWeDoLabel(data?.value).label;
}

function missingTableError(error: { message?: string; code?: string } | null) {
  const message = String(error?.message ?? "");
  if (
    error?.code === "42P01" ||
    /home_what_we_do_items/i.test(message) ||
    /does not exist/i.test(message) ||
    /undefined (table|column)/i.test(message)
  ) {
    return {
      message:
        "The database is missing home_what_we_do_items. On the VPS run: cd staff-portal && npm run db:migrate && npm run build, then restart the portal.",
      code: "schema",
    };
  }
  return null;
}

async function seedCardsIfEmpty(admin: ReturnType<typeof createDatabaseClient>, userId: string | null) {
  const { data: existing, error } = await admin.from("home_what_we_do_items").select("id").limit(1);
  if (error) return { error: missingTableError(error) ?? error };
  if (existing?.length) return { error: null };

  const { data: setting } = await admin.from("site_settings").select("value").eq("key", "what_we_do").maybeSingle();
  const legacy = normalizeWhatWeDo(setting?.value);
  const source = legacy.cards.length ? legacy.cards : structuredClone(DEFAULT_WHAT_WE_DO_CARDS);

  for (let index = 0; index < source.length; index += 1) {
    const row = whatWeDoRowFromCard(source[index], index, userId);
    const { error: insertErr } = await admin.from("home_what_we_do_items").insert(row);
    if (insertErr) return { error: insertErr };
  }

  // Keep only the label in site_settings once cards live in the table.
  await admin.from("site_settings").upsert(
    {
      key: "what_we_do",
      value: { label: legacy.label || "What we do", cards: [] },
      status: "published",
    },
    { onConflict: "key" },
  );
  return { error: null };
}

export async function GET() {
  const { error, session } = await requireStaff("site_settings", "view");
  if (error) return error;

  const admin = createDatabaseClient();
  const seeded = await seedCardsIfEmpty(admin, session?.userId ?? null);
  if (seeded.error) return NextResponse.json({ error: dbError(seeded.error) }, { status: 500 });

  const [label, itemsRes] = await Promise.all([
    loadLabel(admin),
    admin.from("home_what_we_do_items").select("*").order("sort_order", { ascending: true }),
  ]);
  if (itemsRes.error) {
    const schemaErr = missingTableError(itemsRes.error);
    return NextResponse.json({ error: schemaErr?.message ?? dbError(itemsRes.error) }, { status: 500 });
  }

  const split = splitRemoved((itemsRes.data ?? []) as WhatWeDoItemRow[]);
  return NextResponse.json({
    label,
    items: split.items.map(whatWeDoCardFromRow),
    removed: split.removed.map(whatWeDoCardFromRow),
  });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireStaff("site_settings", "edit");
  if (error || !session) return error;

  const body = await req.json().catch(() => ({}));
  const admin = createDatabaseClient();

  if (body.action === "restore") {
    const { error: restoreErr } = await restoreRow(admin, "home_what_we_do_items", String(body.id ?? ""));
    if (restoreErr) return NextResponse.json({ error: dbError(restoreErr) }, { status: 500 });
    await logActivity(session.userId, "site_settings", "restore", "home_what_we_do_item", String(body.id ?? ""));
    return NextResponse.json({ ok: true });
  }

  if (body.scope === "label") {
    const value = normalizeWhatWeDoLabel({ label: body.label });
    const { error: upErr } = await admin.from("site_settings").upsert(
      {
        key: "what_we_do",
        value,
        status: "published",
        updated_by: session.userId,
      },
      { onConflict: "key" },
    );
    if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
    await logActivity(session.userId, "site_settings", "update", "site_setting", "what_we_do");
    return NextResponse.json({ ok: true, label: value.label });
  }

  const cards = Array.isArray(body.cards) ? (body.cards as WhatWeDoCard[]) : null;
  if (cards) {
    if (typeof body.label === "string") {
      const value = normalizeWhatWeDoLabel({ label: body.label });
      const { error: labelErr } = await admin.from("site_settings").upsert(
        {
          key: "what_we_do",
          value,
          status: "published",
          updated_by: session.userId,
        },
        { onConflict: "key" },
      );
      if (labelErr) return NextResponse.json({ error: dbError(labelErr) }, { status: 500 });
    }

    for (let index = 0; index < cards.length; index += 1) {
      const card = cards[index];
      if (card.enabled && !String(card.title ?? "").trim()) {
        return NextResponse.json({ error: "Every enabled card needs a title." }, { status: 400 });
      }
      const row = whatWeDoRowFromCard(card, index, session.userId);
      const previous = await rememberFiles(admin, "home_what_we_do_items", row.id, ["image_path"]);
      const { error: upErr } = await admin.from("home_what_we_do_items").upsert(row);
      if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
      await releaseUnusedValues(admin, previous);
    }
    await logActivity(session.userId, "site_settings", "upsert", "home_what_we_do_item", "batch");
    return NextResponse.json({ ok: true });
  }

  const card = body as WhatWeDoCard;
  if (!card?.id) return NextResponse.json({ error: "Missing card." }, { status: 400 });
  if (card.enabled && !String(card.title ?? "").trim()) {
    return NextResponse.json({ error: "Every enabled card needs a title." }, { status: 400 });
  }
  const sortOrder = Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0;
  const row = whatWeDoRowFromCard(card, sortOrder, session.userId);
  const previous = await rememberFiles(admin, "home_what_we_do_items", row.id, ["image_path"]);
  const { data, error: upErr } = await admin.from("home_what_we_do_items").upsert(row).select("id").single();
  if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
  await releaseUnusedValues(admin, previous);
  await logActivity(session.userId, "site_settings", "upsert", "home_what_we_do_item", data?.id ?? row.id);
  return NextResponse.json({ ok: true, id: data?.id ?? row.id });
}

export async function DELETE(req: NextRequest) {
  const { error, session } = await requireStaff("site_settings", "delete");
  if (error || !session) return error;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Nothing was selected." }, { status: 400 });

  const permanent = new URL(req.url).searchParams.get("permanent") === "1";
  const admin = createDatabaseClient();
  const { error: delErr } = await applyBinDelete(admin, "home_what_we_do_items", id, permanent);
  if (delErr?.code === "bin") return NextResponse.json({ error: delErr.message }, { status: 400 });
  if (delErr) return NextResponse.json({ error: dbError(delErr) }, { status: 500 });
  await logActivity(session.userId, "site_settings", permanent ? "purge" : "delete", "home_what_we_do_item", id);
  return NextResponse.json({ ok: true });
}
