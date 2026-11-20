"use client";

import type { ModuleKey } from "@/lib/modules";
import { UploadCancelledError, uploadFile, type UploadProgress } from "@/lib/upload-client";

export type UploadJobStatus = "uploading" | "finishing" | "done" | "error" | "cancelled";

export type UploadJob = {
  id: string;
  key: string;
  module: ModuleKey;
  label: string;
  percent: number;
  status: UploadJobStatus;
  error?: string;
  result?: { public_url: string; storage_path: string; preview_url?: string };
  fileName: string;
  returnPath: string;
  startedAt: number;
};

type Listener = () => void;

type InternalJob = UploadJob & { controller: AbortController };

const jobs = new Map<string, InternalJob>();
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener());
}

function patch(id: string, partial: Partial<UploadJob>) {
  const current = jobs.get(id);
  if (!current) return;
  jobs.set(id, { ...current, ...partial });
  emit();
}

function publicJob(job: InternalJob): UploadJob {
  const { controller: _controller, ...rest } = job;
  return rest;
}

export function subscribeUploadJobs(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getUploadJobs() {
  return Array.from(jobs.values())
    .map(publicJob)
    .sort((a, b) => b.startedAt - a.startedAt);
}

export function getUploadJob(id: string) {
  const job = jobs.get(id);
  return job ? publicJob(job) : null;
}

export function getActiveUploadJobs(key?: string) {
  return getUploadJobs().filter(
    (job) => (job.status === "uploading" || job.status === "finishing") && (!key || job.key === key)
  );
}

export function clearUploadJob(id: string) {
  if (!jobs.has(id)) return;
  jobs.delete(id);
  emit();
}

export function clearFinishedUploadJobs(key?: string) {
  for (const [id, job] of jobs) {
    if (job.status !== "done" && job.status !== "error" && job.status !== "cancelled") continue;
    if (key && job.key !== key) continue;
    jobs.delete(id);
  }
  emit();
}

/** Abort an in-flight upload. Safe to call more than once. */
export function cancelUploadJob(id: string) {
  const job = jobs.get(id);
  if (!job) return;
  if (job.status !== "uploading" && job.status !== "finishing") return;
  patch(id, { status: "cancelled", label: "Cancelling upload…", error: "Upload cancelled." });
  job.controller.abort();
}

export function cancelActiveUploadJobs(key?: string) {
  for (const job of getActiveUploadJobs(key)) {
    cancelUploadJob(job.id);
  }
}

type StartUploadJobInput = {
  key: string;
  module: ModuleKey;
  file: File;
  label: string;
  returnPath: string;
  extraHeaders?: Record<string, string>;
  /** Shrink large hero/gallery videos in-browser before the network transfer. */
  compress?: boolean;
  /** Called after bytes finish uploading, while the job is still tracked (e.g. save hero slide). */
  afterUpload?: (uploaded: { public_url: string; storage_path: string; preview_url?: string }) => Promise<void>;
};

/** Starts an upload that survives admin page navigations. Progress stays in memory until cleared. */
export function startUploadJob(input: StartUploadJobInput) {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `upload-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const controller = new AbortController();
  const job: InternalJob = {
    id,
    key: input.key,
    module: input.module,
    label: input.label,
    percent: 0,
    status: "uploading",
    fileName: input.file.name,
    returnPath: input.returnPath,
    startedAt: Date.now(),
    controller,
  };
  jobs.set(id, job);
  emit();

  const work = (async () => {
    try {
      let file = input.file;
      if (input.compress) {
        const { compressHeroVideo } = await import("@/lib/compress-hero-video");
        file = await compressHeroVideo(
          input.file,
          (state) => {
            const current = jobs.get(id);
            if (!current || current.status === "cancelled") return;
            patch(id, {
              percent: Math.max(1, Math.min(20, Math.round(state.percent * 0.2))),
              label: state.label,
              status: "uploading",
            });
          },
          controller.signal
        );
        if (jobs.get(id)?.status === "cancelled" || controller.signal.aborted) {
          throw new UploadCancelledError();
        }
      }

      const uploaded = await uploadFile(
        input.module,
        file,
        input.extraHeaders,
        (state: UploadProgress) => {
          const current = jobs.get(id);
          if (!current || current.status === "cancelled") return;
          const percent = input.compress ? Math.max(20, Math.round(20 + state.percent * 0.8)) : state.percent;
          patch(id, {
            percent,
            label: `${input.label} ${state.percent}%`,
            status: "uploading",
          });
        },
        controller.signal
      );
      if (jobs.get(id)?.status === "cancelled" || controller.signal.aborted) {
        throw new UploadCancelledError();
      }
      patch(id, { percent: 100, label: "Saving…", status: "finishing", result: uploaded });
      if (input.afterUpload) await input.afterUpload(uploaded);
      if (jobs.get(id)?.status === "cancelled" || controller.signal.aborted) {
        throw new UploadCancelledError();
      }
      patch(id, { percent: 100, label: "Uploaded", status: "done", result: uploaded });
      return uploaded;
    } catch (err) {
      if (err instanceof UploadCancelledError || controller.signal.aborted || jobs.get(id)?.status === "cancelled") {
        patch(id, { status: "cancelled", label: "Upload cancelled", error: "Upload cancelled." });
        throw new UploadCancelledError();
      }
      const message = err instanceof Error ? err.message : "The upload did not work. Please try again.";
      patch(id, { status: "error", error: message, label: message });
      throw err;
    }
  })();

  return { id, promise: work };
}
