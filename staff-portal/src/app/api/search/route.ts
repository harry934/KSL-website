import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { credentialsCurrent } from "@/lib/api-auth";
import { getStaffSession } from "@/lib/session";
import { hrefForDraft } from "@/lib/draft-review";
import { canAccess, MODULE_LABELS, type ModuleKey } from "@/lib/modules";

type Hit = { id: string; title: string; hint: string; href: string; area: string; text?: string };

function safeLike(value: string) {
  return `%${value.replace(/[%_\\,]/g, "").slice(0, 80)}%`;
}

function rank(title: string, extra: string, query: string) {
  const name = title.toLowerCase();
  const hay = `${name} ${extra.toLowerCase()}`;
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length || !words.every((word) => hay.includes(word))) return 0;
  const phrase = words.join(" ");
  if (name === phrase) return 100;
  if (name.startsWith(phrase)) return 80;
  if (name.includes(phrase)) return 60;
  if (words.every((word) => name.includes(word))) return 40;
  return 15;
}

export async function GET(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const blocked = credentialsCurrent(session);
  if (blocked) return blocked;

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const like = safeLike(q);
  const admin = createAdminClient();
  const can = (key: ModuleKey) => canAccess(session.permissions, key, "view", session.isSuperAdmin);
  const jobs: PromiseLike<Hit[]>[] = [];

  if (can("news")) {
    jobs.push(
      admin
        .from("news_items")
        .select("id, title, category, excerpt")
        .or(`title.ilike.${like},excerpt.ilike.${like},category.ilike.${like}`)
        .is("deleted_at", null)
        .limit(6)
        .then(({ data }) =>
          (data ?? []).map((row) => ({
            id: `news:${row.id}`,
            title: row.title,
            hint: row.category || "News story",
            text: row.excerpt || "",
            href: `/news?edit=${row.id}`,
            area: MODULE_LABELS.news,
          }))
        )
    );
  }

  if (can("events")) {
    jobs.push(
      admin
        .from("event_items")
        .select("id, title, event_date")
        .ilike("title", like)
        .is("deleted_at", null)
        .limit(6)
        .then(({ data }) =>
          (data ?? []).map((row) => ({
            id: `event:${row.id}`,
            title: row.title,
            hint: row.event_date || "Event",
            href: `/events?edit=${row.id}`,
            area: MODULE_LABELS.events,
          }))
        )
    );
  }

  if (can("gallery")) {
    jobs.push(
      admin
        .from("gallery_photos")
        .select("id, title")
        .ilike("title", like)
        .is("deleted_at", null)
        .limit(6)
        .then(({ data }) =>
          (data ?? []).map((row) => ({
            id: `photo:${row.id}`,
            title: row.title || "Untitled photo",
            hint: "Gallery photo",
            href: `/gallery?edit=${row.id}`,
            area: MODULE_LABELS.gallery,
          }))
        )
    );
  }

  if (can("careers")) {
    jobs.push(
      admin
        .from("career_listings")
        .select("id, title, kind")
        .ilike("title", like)
        .is("deleted_at", null)
        .limit(6)
        .then(({ data }) =>
          (data ?? []).map((row) => ({
            id: `job:${row.id}`,
            title: row.title,
            hint: row.kind === "internship" ? "Internship" : "Job opening",
            href: `/careers?edit=${row.id}`,
            area: MODULE_LABELS.careers,
          }))
        )
    );
  }

  if (can("downloads")) {
    jobs.push(
      admin
        .from("download_items")
        .select("id, title, category_label")
        .ilike("title", like)
        .is("deleted_at", null)
        .limit(6)
        .then(({ data }) =>
          (data ?? []).map((row) => ({
            id: `download:${row.id}`,
            title: row.title,
            hint: row.category_label || "Document",
            href: `/downloads?edit=${row.id}`,
            area: MODULE_LABELS.downloads,
          }))
        )
    );
  }

  if (can("products")) {
    jobs.push(
      admin
        .from("products")
        .select("id, name, category_label")
        .or(`name.ilike.${like},category_label.ilike.${like}`)
        .is("deleted_at", null)
        .limit(6)
        .then(({ data }) =>
          (data ?? []).map((row) => ({
            id: `product:${row.id}`,
            title: row.name,
            hint: row.category_label || "Product",
            href: `/products?edit=${row.id}`,
            area: MODULE_LABELS.products,
          }))
        )
    );
  }

  if (can("projects")) {
    jobs.push(
      admin
        .from("projects")
        .select("id, title, category_label, subtitle")
        .or(`title.ilike.${like},subtitle.ilike.${like},category_label.ilike.${like}`)
        .is("deleted_at", null)
        .limit(6)
        .then(({ data }) =>
          (data ?? []).map((row) => ({
            id: `project:${row.id}`,
            title: row.title,
            hint: row.category_label || "Project",
            text: row.subtitle || "",
            href: `/projects?edit=${row.id}`,
            area: MODULE_LABELS.projects,
          }))
        )
    );
  }

  if (can("services")) {
    jobs.push(
      admin
        .from("service_items")
        .select("id, title, excerpt")
        .or(`title.ilike.${like},excerpt.ilike.${like}`)
        .is("deleted_at", null)
        .limit(6)
        .then(({ data }) =>
          (data ?? []).map((row) => ({
            id: `service:${row.id}`,
            title: row.title,
            hint: "Service",
            text: row.excerpt || "",
            href: `/services?edit=${row.id}`,
            area: MODULE_LABELS.services,
          }))
        )
    );
  }

  if (can("faq")) {
    jobs.push(
      admin
        .from("faq_items")
        .select("id, question, answer")
        .or(`question.ilike.${like},answer.ilike.${like}`)
        .is("deleted_at", null)
        .limit(6)
        .then(({ data }) =>
          (data ?? []).map((row) => ({
            id: `faq:${row.id}`,
            title: row.question,
            hint: "Question",
            text: String(row.answer || "").replace(/<[^>]+>/g, " "),
            href: "/faq",
            area: MODULE_LABELS.faq,
          }))
        )
    );
  }

  if (can("csr")) {
    jobs.push(
      admin
        .from("csr_projects")
        .select("id, title, summary")
        .or(`title.ilike.${like},summary.ilike.${like}`)
        .is("deleted_at", null)
        .limit(6)
        .then(({ data }) =>
          (data ?? []).map((row) => ({
            id: `csr:${row.id}`,
            title: row.title,
            hint: "Community programme",
            text: row.summary || "",
            href: `/csr?edit=${row.id}`,
            area: MODULE_LABELS.csr,
          }))
        )
    );
  }

  if (can("organization")) {
    jobs.push(
      admin
        .from("organization_board_members")
        .select("id, full_name, role")
        .or(`full_name.ilike.${like},role.ilike.${like}`)
        .is("deleted_at", null)
        .limit(6)
        .then(({ data }) =>
          (data ?? []).map((row) => ({
            id: `board:${row.id}`,
            title: row.full_name,
            hint: row.role || "Board",
            href: "/board",
            area: "Board",
          }))
        )
    );
  }

  if (can("messages")) {
    jobs.push(
      admin
        .from("website_messages")
        .select("id, first_name, surname, subject")
        .or(`subject.ilike.${like},first_name.ilike.${like},surname.ilike.${like}`)
        .is("deleted_at", null)
        .limit(6)
        .then(({ data }) =>
          (data ?? []).map((row) => ({
            id: `message:${row.id}`,
            title: row.subject || "Website message",
            hint: [row.first_name, row.surname].filter(Boolean).join(" ") || "Website visitor",
            href: `/messages?id=${row.id}`,
            area: MODULE_LABELS.messages,
          }))
        )
    );
  }

  const publishModules = session.isSuperAdmin
    ? null
    : session.permissions.filter((row) => row.can_publish).map((row) => row.module_key);
  if (session.isSuperAdmin || (publishModules && publishModules.length > 0)) {
    let drafts = admin
      .from("content_drafts")
      .select("id, title, module_key, entity_table, entity_id, entity_key")
      .ilike("title", like)
      .limit(6);
    if (publishModules) drafts = drafts.in("module_key", publishModules);
    jobs.push(
      drafts.then(({ data }) =>
        (data ?? []).flatMap((row) => {
          const key = (row.module_key in MODULE_LABELS ? row.module_key : null) as ModuleKey | null;
          if (!key) return [];
          return [
            {
              id: `draft:${row.id}`,
              title: row.title || "Saved changes",
              hint: "Draft waiting to publish",
              href: hrefForDraft(String(row.entity_table), row.entity_id ? String(row.entity_id) : null, String(row.entity_key ?? ""), key),
              area: MODULE_LABELS[key],
            },
          ];
        })
      )
    );
  }

  const groups = await Promise.all(jobs);
  const results = groups
    .flat()
    .map((hit) => ({ hit, score: rank(hit.title, `${hit.hint} ${hit.text || ""}`, q) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.hit.title.length - b.hit.title.length)
    .slice(0, 12)
    .map(({ hit }) => {
      const shown = { ...hit };
      delete shown.text;
      return shown;
    });
  return NextResponse.json({ results });
}
