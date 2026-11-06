"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/portal/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/form-bits";
import { useFeedback } from "@/components/ui/feedback";
import { formatBytes } from "@/lib/downloads";
import { sendJson } from "@/lib/upload-client";

type SpareFile = { bucket: string; path: string; bytes: number; name: string };

const BUCKETS: Record<string, string> = {
  "media-public": "Photos",
  downloads: "Documents",
  avatars: "Account photos",
};

export function SpareFilesPage() {
  const { toast, confirm } = useFeedback();
  const [files, setFiles] = useState<SpareFile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await sendJson("/api/storage/spare", "GET");
      setFiles(data.files ?? []);
    } catch (err) {
      toast((err as Error).message, "error");
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(file: SpareFile) {
    const ok = await confirm({
      title: "Delete this file?",
      message: `"${file.name}" is not used by the website. Deleting it frees the space.`,
      confirmLabel: "Delete file",
      danger: true,
    });
    if (!ok) return;
    try {
      await sendJson("/api/storage/spare", "DELETE", { bucket: file.bucket, path: file.path });
      toast("File deleted.");
      load();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  return (
    <>
      <PageHeader
        title="Files not linked"
        description="These files are in storage, but no page and nothing in the recycle bin points at them. Deleting one frees that space."
      />
      {loading ? (
        <div className="flex items-center gap-2 text-[14px] text-[#5b6775]">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading files…
        </div>
      ) : files.length === 0 ? (
        <EmptyState>Every stored file is linked to something.</EmptyState>
      ) : (
        <ul className="divide-y divide-[#eef1f4] overflow-hidden rounded-[10px] border border-[#e3e8ee] bg-white">
          {files.map((file) => (
            <li key={`${file.bucket}/${file.path}`} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-[200px] flex-1">
                <p className="break-all text-[14px] font-semibold text-[#0b1f3a]">{file.name}</p>
                <p className="mt-0.5 text-[12.5px] text-[#6b7785]">
                  {BUCKETS[file.bucket] || file.bucket} · {formatBytes(file.bytes) || "0 B"}
                </p>
              </div>
              <Button variant="danger" onClick={() => remove(file)}>
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
