"use client";

import type { ModuleKey } from "@/lib/modules";
import { uploadFile, type UploadProgress } from "@/lib/upload-client";

export type UploadJobStatus = "uploading" | "finishing" | "done" | "error";

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

const jobs = new Map<string, UploadJob>();
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

export function subscribeUploadJobs(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getUploadJobs() {
  return Array.from(jobs.values()).sort((a, b) => b.startedAt - a.startedAt);
}

export function getUploadJob(id: string) {
  return jobs.get(id) ?? null;
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
    if (job.status !== "done" && job.status !== "error") continue;
    if (key && job.key !== key) continue;
    jobs.delete(id);
  }
  emit();
}

type StartUploadJobInput = {
  key: string;
  module: ModuleKey;
  file: File;
  label: string;
  returnPath: string;
  extraHeaders?: Record<string, string>;
  /** Called after bytes finish uploading, while the job is still tracked (e.g. save hero slide). */
  afterUpload?: (uploaded: { public_url: string; storage_path: string; preview_url?: string }) => Promise<void>;
};

/** Starts an upload that survives admin page navigations. Progress stays in memory until cleared. */
export function startUploadJob(input: StartUploadJobInput) {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `upload-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const job: UploadJob = {
    id,
    key: input.key,
    module: input.module,
    label: input.label,
    percent: 0,
    status: "uploading",
    fileName: input.file.name,
    returnPath: input.returnPath,
    startedAt: Date.now(),
  };
  jobs.set(id, job);
  emit();

  const work = (async () => {
    try {
      const uploaded = await uploadFile(input.module, input.file, input.extraHeaders, (state: UploadProgress) => {
        patch(id, {
          percent: state.percent,
          label: `${input.label} ${state.percent}%`,
          status: "uploading",
        });
      });
      patch(id, { percent: 100, label: "Saving…", status: "finishing", result: uploaded });
      if (input.afterUpload) await input.afterUpload(uploaded);
      patch(id, { percent: 100, label: "Uploaded", status: "done", result: uploaded });
      return uploaded;
    } catch (err) {
      const message = err instanceof Error ? err.message : "The upload did not work. Please try again.";
      patch(id, { status: "error", error: message, label: message });
      throw err;
    }
  })();

  return { id, promise: work };
}
