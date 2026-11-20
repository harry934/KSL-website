import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/api-auth";
import { createChunkUpload, signUploadId } from "@/lib/chunked-upload";
import type { ModuleKey } from "@/lib/modules";

export const maxDuration = 60;

const ALLOWED_MODULES = new Set<ModuleKey>([
  "news", "gallery", "events", "services", "products", "projects", "downloads",
  "csr", "press", "careers", "organization", "site_settings",
]);

const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

const IMAGE_EXTS = new Set(["jpg", "png", "webp"]);
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_DOC_BYTES = 100 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

function extensionFor(name: string, type: string, allowVideo: boolean) {
  let ext = TYPES[type];
  const lower = name.toLowerCase();
  if (!ext) {
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) ext = "jpg";
    else if (lower.endsWith(".png")) ext = "png";
    else if (lower.endsWith(".webp")) ext = "webp";
    else if (lower.endsWith(".pdf")) ext = "pdf";
    else if (lower.endsWith(".doc")) ext = "doc";
    else if (lower.endsWith(".docx")) ext = "docx";
  }
  if (!ext && allowVideo) {
    if (type === "video/webm" || lower.endsWith(".webm")) ext = "webm";
    else if (
      type === "video/mp4" ||
      type === "video/quicktime" ||
      type === "video/x-quicktime" ||
      lower.endsWith(".mp4") ||
      lower.endsWith(".m4v") ||
      lower.endsWith(".mov")
    ) {
      ext = "mp4";
    }
  }
  return ext;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
  }

  const moduleKey = String((body as { module?: string }).module || "gallery") as ModuleKey;
  if (!ALLOWED_MODULES.has(moduleKey)) {
    return NextResponse.json({ error: "Invalid module" }, { status: 400 });
  }

  const { error, session } = await requireStaff(moduleKey, "edit");
  if (error || !session) return error;

  const name = String((body as { name?: string }).name || "upload.bin").trim() || "upload.bin";
  const contentType = String((body as { contentType?: string }).contentType || "application/octet-stream").trim();
  const size = Number((body as { size?: number }).size);
  const heroVideo = (body as { heroVideo?: boolean }).heroVideo === true && moduleKey === "site_settings";
  const galleryVideo = (body as { galleryVideo?: boolean }).galleryVideo === true && moduleKey === "gallery";
  const allowVideo = heroVideo || galleryVideo;

  if (!Number.isFinite(size) || size < 1) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  const ext = extensionFor(name, contentType, allowVideo);
  if (!ext) {
    return NextResponse.json(
      {
        error: allowVideo
          ? "Use a JPG, PNG or WebP photo, or an MP4 or WebM video."
          : "Only JPG, PNG or WebP images, or PDF / Word documents are allowed.",
      },
      { status: 400 }
    );
  }

  const video = ext === "mp4" || ext === "webm";
  const image = IMAGE_EXTS.has(ext);
  const limit = video ? MAX_VIDEO_BYTES : image ? MAX_BYTES : MAX_DOC_BYTES;
  if (size > limit) {
    return NextResponse.json({ error: `File is too large (max ${Math.round(limit / 1024 / 1024)} MB).` }, { status: 400 });
  }

  const bucket = image || video ? "media-public" : "downloads";
  const storagePath = `${moduleKey}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const resolvedType =
    video
      ? ext === "webm"
        ? "video/webm"
        : "video/mp4"
      : TYPES[contentType]
        ? contentType
        : image
          ? ext === "jpg"
            ? "image/jpeg"
            : ext === "png"
              ? "image/png"
              : "image/webp"
          : contentType || "application/octet-stream";

  try {
    const meta = await createChunkUpload({
      userId: session.userId,
      module: moduleKey,
      bucket,
      path: storagePath,
      name,
      contentType: resolvedType,
      ext,
      size,
    });
    return NextResponse.json({
      uploadId: meta.id,
      signature: signUploadId(meta.id, session.userId),
      // 1 MB chunks: progress moves often; a hung chunk can be retried without restarting the whole video.
      chunkSize: 1024 * 1024,
      mode: "binary",
    });
  } catch (err) {
    console.error("Could not start chunked upload", err);
    return NextResponse.json({ error: "The upload did not work. Please try again." }, { status: 500 });
  }
}
