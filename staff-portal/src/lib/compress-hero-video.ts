"use client";

export type CompressProgress = {
  phase: "compressing" | "done" | "skipped";
  percent: number;
  label: string;
};

/** Keep originals under this size — browser re-encode is always lossy. */
const SKIP_UNDER_BYTES = 40 * 1024 * 1024;
/** Only downscale when wider than this. */
const MAX_WIDTH = 1920;
/** Target encode rate for ~1080p hero clips (was 2.5 Mbps — soft and muddy). */
const VIDEO_BITS_PER_SECOND = 8_000_000;
const AUDIO_BITS_PER_SECOND = 160_000;

function pickRecorderMime() {
  const options = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];
  for (const type of options) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

function waitForEvent(target: EventTarget, event: string, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const onAbort = () => {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };
    const onOk = () => {
      cleanup();
      resolve();
    };
    const onErr = () => {
      cleanup();
      reject(new Error("Could not read that video for compression."));
    };
    const cleanup = () => {
      target.removeEventListener(event, onOk);
      target.removeEventListener("error", onErr);
      signal?.removeEventListener("abort", onAbort);
    };
    target.addEventListener(event, onOk, { once: true });
    target.addEventListener("error", onErr, { once: true });
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Optionally shrinks very large hero videos in the browser before upload.
 *
 * IMPORTANT: must record at playbackRate 1. Speeding playback (e.g. 3×) makes
 * MediaRecorder stamp wall-clock time while content advances faster, so the
 * saved file plays back fast-forwarded. That was the production bug.
 */
export async function compressHeroVideo(
  file: File,
  onProgress?: (state: CompressProgress) => void,
  signal?: AbortSignal
): Promise<File> {
  if (file.size <= SKIP_UNDER_BYTES) {
    onProgress?.({ phase: "skipped", percent: 100, label: "Keeping original video quality…" });
    return file;
  }

  const mime = pickRecorderMime();
  if (!mime || typeof document === "undefined") {
    onProgress?.({ phase: "skipped", percent: 100, label: "Uploading original video…" });
    return file;
  }

  onProgress?.({ phase: "compressing", percent: 2, label: "Preparing a web-friendly copy…" });

  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = objectUrl;

  let raf = 0;
  let mediaStream: MediaStream | null = null;
  let canvasStream: MediaStream | null = null;
  let recordStream: MediaStream | null = null;

  try {
    await waitForEvent(video, "loadedmetadata", signal);
    if (!video.videoWidth || !video.videoHeight || !Number.isFinite(video.duration) || video.duration < 0.2) {
      return file;
    }

    const needsDownscale = video.videoWidth > MAX_WIDTH;
    // Huge file but already ≤1080p-ish: prefer original over a muddy re-encode.
    if (!needsDownscale) {
      onProgress?.({ phase: "skipped", percent: 100, label: "Keeping original video quality…" });
      return file;
    }

    const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
    const width = Math.max(2, Math.round((video.videoWidth * scale) / 2) * 2);
    const height = Math.max(2, Math.round((video.videoHeight * scale) / 2) * 2);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
    if (!ctx) return file;

    // 30fps wall-clock capture; content must advance at 1× so duration stays correct.
    canvasStream = canvas.captureStream(30);
    mediaStream = (video as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream?.() || null;
    recordStream = canvasStream;
    if (mediaStream) {
      for (const track of mediaStream.getAudioTracks()) recordStream.addTrack(track);
    }

    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(recordStream, {
      mimeType: mime,
      videoBitsPerSecond: VIDEO_BITS_PER_SECOND,
      audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
    });
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };

    const recorded = new Promise<Blob>((resolve, reject) => {
      recorder.onerror = () => reject(new Error("Video compression failed."));
      recorder.onstop = () =>
        resolve(new Blob(chunks, { type: mime.includes("mp4") ? "video/mp4" : "video/webm" }));
    });

    const duration = Math.max(0.2, video.duration);
    const draw = () => {
      if (video.ended || video.paused) return;
      ctx.drawImage(video, 0, 0, width, height);
      raf = requestAnimationFrame(draw);
    };

    video.currentTime = 0;
    await waitForEvent(video, "seeked", signal).catch(() => undefined);

    // Must stay at 1×. Any rate > 1 shortens the recorded timeline (fast-forward).
    try {
      video.playbackRate = 1;
    } catch {
      /* ignore */
    }

    recorder.start(200);
    const playPromise = video.play();
    if (playPromise) await playPromise;
    draw();

    await new Promise<void>((resolve, reject) => {
      const onAbort = () => {
        cleanup();
        reject(new DOMException("Aborted", "AbortError"));
      };
      const onEnded = () => {
        cleanup();
        resolve();
      };
      const onTime = () => {
        const percent = Math.max(3, Math.min(92, Math.round((video.currentTime / duration) * 90) + 3));
        onProgress?.({ phase: "compressing", percent, label: `Optimizing video… ${percent}%` });
      };
      const cleanup = () => {
        video.removeEventListener("ended", onEnded);
        video.removeEventListener("timeupdate", onTime);
        signal?.removeEventListener("abort", onAbort);
      };
      video.addEventListener("ended", onEnded, { once: true });
      video.addEventListener("timeupdate", onTime);
      signal?.addEventListener("abort", onAbort, { once: true });
      if (signal?.aborted) onAbort();
    });

    cancelAnimationFrame(raf);
    ctx.drawImage(video, 0, 0, width, height);
    await new Promise((r) => window.setTimeout(r, 80));
    if (recorder.state !== "inactive") recorder.stop();

    const blob = await recorded;
    if (!blob.size || blob.size >= file.size * 0.92) {
      onProgress?.({ phase: "skipped", percent: 100, label: "Keeping original video…" });
      return file;
    }

    const ext = blob.type.includes("mp4") ? "mp4" : "webm";
    const base = file.name.replace(/\.[a-z0-9]+$/i, "") || "hero-video";
    const next = new File([blob], `${base}-web.${ext}`, {
      type: blob.type,
      lastModified: Date.now(),
    });
    onProgress?.({
      phase: "done",
      percent: 100,
      label: `Optimized ${(file.size / 1048576).toFixed(1)} MB → ${(next.size / 1048576).toFixed(1)} MB`,
    });
    return next;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    onProgress?.({ phase: "skipped", percent: 100, label: "Uploading original video…" });
    return file;
  } finally {
    cancelAnimationFrame(raf);
    video.pause();
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(objectUrl);
    canvasStream?.getTracks().forEach((track) => track.stop());
    mediaStream?.getTracks().forEach((track) => track.stop());
    recordStream?.getTracks().forEach((track) => track.stop());
  }
}
