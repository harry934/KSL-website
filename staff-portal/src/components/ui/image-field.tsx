"use client";

import { useState } from "react";
import { ImageIcon, Loader2, Upload } from "lucide-react";
import type { ModuleKey } from "@/lib/modules";
import { siteAssetUrl } from "@/lib/site-url";
import { uploadFile } from "@/lib/upload-client";
import { PhotoCropDialog } from "@/components/ui/photo-crop";
import { cn } from "@/lib/cn";

export function ImageField({
  module,
  value,
  onChange,
  compact,
}: {
  module: ModuleKey;
  value: string;
  onChange: (url: string) => void;
  compact?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<File | null>(null);

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const data = await uploadFile(module, file);
      onChange(data.public_url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  const preview = value ? siteAssetUrl(value) : "";

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-[#e3e8ee] bg-[#f6f8fa] text-[#98a3b1]",
          compact ? "h-14 w-20" : "h-20 w-28"
        )}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <ImageIcon className="h-6 w-6" />
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <label
            className={cn(
              "inline-flex h-[34px] cursor-pointer items-center gap-2 rounded-[6px] border border-[#d5dce4] bg-white px-3 text-[13px] font-semibold text-[#0b1f3a] transition-colors hover:bg-[#f4f6f8]",
              uploading && "pointer-events-none opacity-60"
            )}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Uploading…" : value ? "Change photo" : "Upload a photo"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) setPending(file);
              }}
            />
          </label>
          {value && !uploading && (
            <button type="button" className="text-[13px] font-semibold text-[#b42318] hover:underline" onClick={() => onChange("")}>
              Remove
            </button>
          )}
        </div>
        {!compact && <p className="text-[12px] text-[#6b7785]">JPG, PNG or WebP, up to 8 MB.</p>}
        {error && <p className="text-[12.5px] text-[#b42318]">{error}</p>}
      </div>
      {pending && (
        <PhotoCropDialog
          file={pending}
          onCancel={() => setPending(null)}
          onDone={(next) => {
            setPending(null);
            upload(next);
          }}
        />
      )}
    </div>
  );
}
