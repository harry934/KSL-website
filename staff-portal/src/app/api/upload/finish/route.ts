import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/api-auth";
import {
  abortChunkUpload,
  finishChunkUpload,
  loadChunkUpload,
  peekChunkUpload,
  verifyUploadId,
} from "@/lib/chunked-upload";
import { matchesDeclaredType, mp4IsHevc } from "@/lib/file-bytes";
import { privateRef } from "@/lib/stored-file";
import { signedStoredFileUrl, storedFileUrl } from "@/lib/storage";
import type { ModuleKey } from "@/lib/modules";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
  }

  const moduleKey = String((body as { module?: string }).module || "gallery") as ModuleKey;
  const uploadId = String((body as { uploadId?: string }).uploadId || "").trim();
  const signature = String((body as { signature?: string }).signature || "").trim();

  const { error, session } = await requireStaff(moduleKey, "edit");
  if (error || !session) return error;

  if (!uploadId || !signature || !verifyUploadId(uploadId, session.userId, signature)) {
    return NextResponse.json({ error: "Invalid upload session." }, { status: 403 });
  }

  try {
    const pending = await loadChunkUpload(uploadId, session.userId);
    const head = await peekChunkUpload(uploadId, session.userId, 256);
    if (!matchesDeclaredType(head, pending.ext)) {
      await abortChunkUpload(uploadId, session.userId);
      return NextResponse.json({ error: "The file contents do not match the selected type." }, { status: 400 });
    }
    if (pending.ext === "mp4" && mp4IsHevc(head)) {
      await abortChunkUpload(uploadId, session.userId);
      return NextResponse.json(
        { error: "This film uses a format the website cannot play. Export it as an MP4 (H.264) and upload that." },
        { status: 400 }
      );
    }

    const meta = await finishChunkUpload(uploadId, session.userId);
    const image = meta.ext === "jpg" || meta.ext === "png" || meta.ext === "webp";
    const video = meta.ext === "mp4" || meta.ext === "webm";

    if (!image && !video) {
      try {
        return NextResponse.json({
          ok: true,
          storage_path: meta.path,
          public_url: privateRef(meta.path),
          preview_url: signedStoredFileUrl(meta.bucket, meta.path, 3600),
        });
      } catch {
        return NextResponse.json({
          ok: true,
          storage_path: meta.path,
          public_url: privateRef(meta.path),
        });
      }
    }

    const url = storedFileUrl(meta.bucket, meta.path);
    return NextResponse.json({ ok: true, storage_path: meta.path, public_url: url, preview_url: url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "The upload did not work. Please try again.";
    console.error("Could not finish chunked upload", err);
    await abortChunkUpload(uploadId, session.userId).catch(() => null);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
