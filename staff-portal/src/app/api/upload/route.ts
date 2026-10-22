import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, dbError } from "@/lib/api-auth";
import { matchesDeclaredType, mp4IsHevc } from "@/lib/file-bytes";
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
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

const VIDEO_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
};

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

  if ((req.headers.get("content-type") || "").includes("application/json")) {
    return signHeroVideo(req);
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  const heroVideo = req.headers.get("x-ksl-hero") === "1" && moduleKey === "site_settings";
  let ext = TYPES[file.type];
  let video = false;
  if (!ext && heroVideo) {
    ext = VIDEO_TYPES[file.type];
    if (!ext) {
      const name = file.name.toLowerCase();
      if ((file.type === "" || file.type === "application/octet-stream") && name.endsWith(".mp4")) ext = "mp4";
      else if ((file.type === "" || file.type === "application/octet-stream") && name.endsWith(".webm")) ext = "webm";
    }
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
  const limit = video ? MAX_VIDEO_BYTES : IMAGE_EXTS.has(ext) ? MAX_BYTES : MAX_DOC_BYTES;
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
  const bucket = image || video ? "media-public" : "downloads";
  const { error: upErr } = await admin.storage.from(bucket).upload(path, buffer, {
    contentType: video ? (ext === "webm" ? "video/webm" : "video/mp4") : file.type,
    cacheControl: image || video ? "31536000" : "3600",
    upsert: false,
  });

  if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });

  if (!image && !video) {
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

function heroExtension(name: string, type: string) {
  if (type === "video/webm") return "webm";
  if (type === "video/mp4" || type === "video/quicktime" || type === "video/x-quicktime") return "mp4";
  const lower = name.toLowerCase();
  const loose = type === "" || type === "application/octet-stream";
  if (!loose && type !== "video/mp4" && type !== "video/webm" && type !== "video/quicktime" && type !== "video/x-quicktime") return null;
  if (lower.endsWith(".webm")) return "webm";
  if (lower.endsWith(".mp4") || lower.endsWith(".m4v") || lower.endsWith(".mov")) return "mp4";
  return null;
}

function prefixBytes(value: unknown) {
  if (!Array.isArray(value) || value.length < 8 || value.length > 256) return null;
  const bytes = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i++) {
    const part = value[i];
    if (typeof part !== "number" || !Number.isInteger(part) || part < 0 || part > 255) return null;
    bytes[i] = part;
  }
  return bytes;
}

/** Gives the browser a short-lived address so a film can go straight to storage. */
async function signHeroVideo(req: NextRequest) {
  if (req.headers.get("x-ksl-hero") !== "1" || req.headers.get("x-ksl-module") !== "site_settings") {
    return NextResponse.json({ error: "Video can only be added to the home hero." }, { status: 400 });
  }
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name : "";
  const type = typeof body?.type === "string" ? body.type : "";
  const size = body?.size;
  const ext = heroExtension(name, type);
  if (!ext || typeof size !== "number" || !Number.isFinite(size) || size <= 0) {
    return NextResponse.json({ error: "Use an MP4, WebM, or MOV video." }, { status: 400 });
  }
  if (size > MAX_VIDEO_BYTES) {
    return NextResponse.json({ error: "Video is too large (max 50 MB)." }, { status: 400 });
  }
  const prefix = prefixBytes(body?.prefix);
  if (!prefix || !matchesDeclaredType(prefix, ext)) {
    return NextResponse.json({ error: "That file is not a valid MP4 or WebM video." }, { status: 400 });
  }
  if (ext === "mp4" && mp4IsHevc(prefix)) {
    return NextResponse.json({ error: "This film uses a format the website cannot play. Export it as an MP4 (H.264) and upload that." }, { status: 400 });
  }

  const path = `site_settings/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from("media-public").createSignedUploadUrl(path);
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "The video could not be saved. Please try again." }, { status: 500 });
  }
  const { data: pub } = admin.storage.from("media-public").getPublicUrl(path);
  return NextResponse.json({
    storage_path: path,
    public_url: pub.publicUrl,
    signed_url: data.signedUrl,
    content_type: ext === "webm" ? "video/webm" : "video/mp4",
  });
}
