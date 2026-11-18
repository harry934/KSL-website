import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/api-auth";
import { canAccess, type ModuleKey } from "@/lib/modules";
import { loadStoredFile, isPublicStorageBucket, signedStoredFileUrl, verifyStoredFileSignature } from "@/lib/storage";

export const runtime = "nodejs";

const FILE_MODULES = new Set<ModuleKey>([
  "news", "gallery", "events", "services", "products", "projects", "downloads",
  "csr", "press", "careers", "organization", "site_settings",
]);
const PATH_PATTERN = /^[a-zA-Z0-9._ -]+(?:\/[a-zA-Z0-9._ -]+)*$/;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const ref = url.searchParams.get("ref");
  if (ref) {
    const { error, session } = await requireStaff(null, "view");
    if (error || !session) return error;
    const file = ref.startsWith("private:") ? ref.slice("private:".length) : "";
    const moduleKey = file.split("/")[0] as ModuleKey;
    if (!FILE_MODULES.has(moduleKey) || !canAccess(session.permissions, moduleKey, "view", session.isSuperAdmin)) {
      return NextResponse.json({ error: "That file is not available." }, { status: 404 });
    }
    if (!PATH_PATTERN.test(file) || file.includes("..")) {
      return NextResponse.json({ error: "That file is not available." }, { status: 404 });
    }
    return NextResponse.json({ url: signedStoredFileUrl("downloads", file, 3600) });
  }

  const bucket = url.searchParams.get("bucket") ?? "";
  const file = url.searchParams.get("path") ?? "";
  if (!PATH_PATTERN.test(file) || file.includes("..")) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
  if (!isPublicStorageBucket(bucket)) {
    const expires = Number(url.searchParams.get("expires"));
    const signature = url.searchParams.get("signature") ?? "";
    if (!verifyStoredFileSignature(bucket, file, expires, signature)) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }
  }

  const stored = await loadStoredFile(bucket, file);
  if (!stored) return NextResponse.json({ error: "File not found." }, { status: 404 });
  return new NextResponse(stored.bytes, {
    headers: {
      "Content-Type": stored.contentType,
      "Content-Length": String(stored.size),
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": isPublicStorageBucket(bucket) ? "public, max-age=31536000, immutable" : "private, no-store",
    },
  });
}
