import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, dbError } from "@/lib/api-auth";
import { matchesDeclaredType } from "@/lib/file-bytes";
import { privateRef } from "@/lib/stored-file";
import type { ModuleKey } from "@/lib/modules";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_MODULES = new Set<ModuleKey>([
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

const MAX_BYTES = 8 * 1024 * 1024;
const MAX_DOC_BYTES = 25 * 1024 * 1024;

const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

const IMAGE_EXTS = new Set(["jpg", "png", "webp"]);

export async function POST(req: NextRequest) {
  const moduleKey = (req.headers.get("x-ksl-module") || "gallery") as ModuleKey;
  if (!ALLOWED_MODULES.has(moduleKey)) {
    return NextResponse.json({ error: "Invalid module" }, { status: 400 });
  }

  const { error, session } = await requireStaff(moduleKey, "edit");
  if (error || !session) return error;

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  const ext = TYPES[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Only JPG, PNG or WebP images, or PDF / Word documents are allowed." },
      { status: 400 }
    );
  }
  const limit = IMAGE_EXTS.has(ext) ? MAX_BYTES : MAX_DOC_BYTES;
  if (file.size > limit) {
    return NextResponse.json({ error: `File is too large (max ${Math.round(limit / 1024 / 1024)} MB).` }, { status: 400 });
  }

  const path = `${moduleKey}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const admin = createAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!matchesDeclaredType(buffer, ext)) {
    return NextResponse.json({ error: "The file contents do not match the selected type." }, { status: 400 });
  }
  const image = IMAGE_EXTS.has(ext);
  const bucket = image ? "media-public" : "downloads";
  const { error: upErr } = await admin.storage.from(bucket).upload(path, buffer, {
    contentType: file.type,
    cacheControl: image ? "31536000" : "3600",
    upsert: false,
  });

  if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });

  if (!image) {
    const { data: signed } = await admin.storage.from(bucket).createSignedUrl(path, 3600);
    return NextResponse.json({
      storage_path: path,
      public_url: privateRef(path),
      preview_url: signed?.signedUrl ?? "",
    });
  }

  const { data: pub } = admin.storage.from(bucket).getPublicUrl(path);
  return NextResponse.json({ storage_path: path, public_url: pub.publicUrl, preview_url: pub.publicUrl });
}
