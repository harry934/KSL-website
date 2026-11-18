import { requireStaff } from "@/lib/api-auth";
import { matchesDeclaredType, mp4IsHevc } from "@/lib/file-bytes";
import { privateRef } from "@/lib/stored-file";
import { saveStoredFile, signedStoredFileUrl, storedFileUrl } from "@/lib/storage";
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
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

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

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  const heroVideo = req.headers.get("x-ksl-hero") === "1" && moduleKey === "site_settings";
  let ext: string | undefined = TYPES[file.type];
  let video = false;
  if (!ext && heroVideo) {
    ext = heroExtension(file.name, file.type);
    video = Boolean(ext);
  }
  if (!ext) {
    return NextResponse.json(
      {
        error: heroVideo
          ? "Use a JPG, PNG or WebP photo, or an MP4 or WebM video."
          : "Only JPG, PNG or WebP images, or PDF / Word documents are allowed.",
      },
      { status: 400 }
    );
  }
  const validExt = ext;
  const limit = video ? MAX_VIDEO_BYTES : IMAGE_EXTS.has(validExt) ? MAX_BYTES : MAX_DOC_BYTES;
  if (file.size > limit) {
    return NextResponse.json({ error: `File is too large (max ${Math.round(limit / 1024 / 1024)} MB).` }, { status: 400 });
  }

  const path = `${moduleKey}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${validExt}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!matchesDeclaredType(buffer, validExt)) {
    return NextResponse.json({ error: "The file contents do not match the selected type." }, { status: 400 });
  }
  if (video && validExt === "mp4" && mp4IsHevc(buffer)) {
    return NextResponse.json({ error: "This film uses a format the website cannot play. Export it as an MP4 (H.264) and upload that." }, { status: 400 });
  }
  const image = IMAGE_EXTS.has(validExt);
  const bucket = image || video ? "media-public" : "downloads";
  const contentType = video ? (validExt === "webm" ? "video/webm" : "video/mp4") : file.type;
  try {
    await saveStoredFile(bucket, path, buffer, contentType);
  } catch (uploadError) {
    console.error("Could not save uploaded file", uploadError);
    return NextResponse.json({ error: "The upload did not work. Please try again." }, { status: 500 });
  }

  if (!image && !video) {
    return NextResponse.json({
      storage_path: path,
      public_url: privateRef(path),
      preview_url: signedStoredFileUrl(bucket, path, 3600),
    });
  }

  const url = storedFileUrl(bucket, path);
  return NextResponse.json({ storage_path: path, public_url: url, preview_url: url });
}

function heroExtension(name: string, type: string): string | undefined {
  if (type === "video/webm") return "webm";
  if (type === "video/mp4" || type === "video/quicktime" || type === "video/x-quicktime") return "mp4";
  const lower = name.toLowerCase();
  const loose = type === "" || type === "application/octet-stream";
  if (!loose && type !== "video/mp4" && type !== "video/webm" && type !== "video/quicktime" && type !== "video/x-quicktime") return;
  if (lower.endsWith(".webm")) return "webm";
  if (lower.endsWith(".mp4") || lower.endsWith(".m4v") || lower.endsWith(".mov")) return "mp4";
  return;
}
