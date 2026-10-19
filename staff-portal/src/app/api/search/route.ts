import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { credentialsCurrent } from "@/lib/api-auth";
import { getStaffSession } from "@/lib/session";
import { canAccess, MODULE_LABELS, type ModuleKey } from "@/lib/modules";

type Hit = { id: string; title: string; hint: string; href: string; area: string };

function safeLike(value: string) {
  return `%${value.replace(/[%_\\]/g, "").slice(0, 80)}%`;
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
        .select("id, title, category")
        .ilike("title", like)
        .limit(6)
        .then(({ data }) =>
          (data ?? []).map((row) => ({
            id: `news:${row.id}`,
            title: row.title,
            hint: row.category || "News story",
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
        .limit(6)
        .then(({ data }) =>
          (data ?? []).map((row) => ({
            id: `photo:${row.id}`,
            title: row.title || "Untitled photo",
            hint: "Gallery photo",
            href: "/gallery",
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
        .ilike("name", like)
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
        .select("id, title, category_label")
        .ilike("title", like)
        .limit(6)
        .then(({ data }) =>
          (data ?? []).map((row) => ({
            id: `project:${row.id}`,
            title: row.title,
            hint: row.category_label || "Project",
            href: `/projects?edit=${row.id}`,
            area: MODULE_LABELS.projects,
          }))
        )
    );
  }

  const groups = await Promise.all(jobs);
  return NextResponse.json({ results: groups.flat().slice(0, 18) });
}
