"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import type { ModuleKey } from "@/lib/modules";

export function ImageField({
  module,
  value,
  onChange,
}: {
  module: ModuleKey;
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", headers: { "x-ksl-module": module }, body: fd });
    const data = await res.json().catch(() => ({}));
    setUploading(false);
    if (!res.ok) {
      setError(data.error ?? "Upload failed");
      return;
    }
    onChange(data.public_url);
  }

  const preview = value && (/^https?:\/\//.test(value) ? value : null);

  return (
    <div className="flex min-w-0 items-start gap-3">
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" className="h-16 w-24 shrink-0 border border-[#d7dde5] object-cover" loading="lazy" />
      ) : (
        <div className="flex h-16 w-24 shrink-0 items-center justify-center border border-dashed border-[#d7dde5] text-[11px] text-[#8f9aaa]">
          {value ? "Site image" : "No image"}
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-2">
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="img/ksl/... or uploaded URL" />
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#5b6775]">
          <label className="cursor-pointer rounded-[2px] border border-[#0b1f3a] px-2.5 py-1 font-semibold text-[#0b1f3a] hover:border-[#c5a028]">
            {uploading ? "Uploading…" : "Upload image"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
          </label>
          <span>JPG, PNG or WebP, max 8 MB.</span>
        </div>
        {error && <p className="text-[12px] text-[#b42318]">{error}</p>}
      </div>
    </div>
  );
}
