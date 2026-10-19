import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/api-auth";
import { canAccess, type ModuleKey } from "@/lib/modules";
import { openStoredUrl } from "@/lib/stored-file";
import { NextRequest, NextResponse } from "next/server";

const FILE_MODULES = new Set<ModuleKey>([
  "news",
  "gallery",
  "events",
  "services",
  "products",
  "projects",
  "downloads",
  "csr",
  "press",
  "careers",
  "organization",
  "site_settings",
]);

export async function GET(req: NextRequest) {
  const { error, session } = await requireStaff(null, "view");
  if (error || !session) return error;

  const ref = new URL(req.url).searchParams.get("ref") || "";
  const path = ref.startsWith("private:") ? ref.slice("private:".length) : "";
  const moduleKey = path.split("/")[0] as ModuleKey;
  if (!FILE_MODULES.has(moduleKey) || !canAccess(session.permissions, moduleKey, "view", session.isSuperAdmin)) {
    return NextResponse.json({ error: "That file is not available." }, { status: 404 });
  }

  const url = await openStoredUrl(createAdminClient(), ref, 3600);
  if (!url || url === ref) return NextResponse.json({ error: "That file is not available." }, { status: 404 });
  return NextResponse.json({ url });
}
