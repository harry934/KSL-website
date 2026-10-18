"use client";

import { useEffect, useState } from "react";
import { FileText, Link2, Loader2, Upload } from "lucide-react";
import type { ModuleKey } from "@/lib/modules";
import { uploadFile } from "@/lib/upload-client";
import { siteAssetUrl } from "@/lib/site-url";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

function fileLabel(href: string) {
  if (!href) return "";
  const clean = href.split(/[?#]/)[0];
  return decodeURIComponent(clean.slice(clean.lastIndexOf("/") + 1)) || href;
}

/** Upload a PDF or Word file, or paste a link to one. */
export function FileField({
  module,
  value,
  onChange,
  allowImages,
  allowLink = true,
}: {
  module: ModuleKey;
  value: string;
  onChange: (href: string) => void;
  allowImages?: boolean;
  allowLink?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasting, setPasting] = useState(false);
  const [openHref, setOpenHref] = useState(value);

  useEffect(() => {
    if (!value.startsWith("private:")) {
      setOpenHref(value);
      return;
    }
    let cancel = false;
    fetch(`/api/stored-file?ref=${encodeURIComponent(value)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancel && data.url) setOpenHref(data.url);
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, [value]);

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const data = await uploadFile(module, file);
      onChange(data.public_url);
      if (data.preview_url) setOpenHref(data.preview_url);
      setPasting(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-w-0 space-y-2">
      {value && !pasting && (
        <a
          href={siteAssetUrl(openHref)}
          target="_blank"
          rel="noreferrer"
          className="flex min-w-0 items-center gap-2 rounded-[6px] border border-[#e3e8ee] bg-[#f6f8fa] px-3 py-2 text-[13px] text-[#0b1f3a] hover:bg-white"
        >
          <FileText className="h-4 w-4 shrink-0 text-[#5b6775]" />
          <span className="truncate">{fileLabel(value)}</span>
        </a>
      )}
      {pasting && (
        <Input value={value} onChange={(e) => onChange(e.target.value.trim())} placeholder="https://…" autoFocus />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <label
          className={cn(
            "inline-flex h-[34px] cursor-pointer items-center gap-2 rounded-[6px] border border-[#d5dce4] bg-white px-3 text-[13px] font-semibold text-[#0b1f3a] transition-colors hover:bg-[#f4f6f8]",
            uploading && "pointer-events-none opacity-60"
          )}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? "Uploading…" : value ? "Replace file" : "Upload file"}
          <input
            type="file"
            accept={`.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document${allowImages ? ",image/jpeg,image/png,image/webp" : ""}`}
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) upload(file);
            }}
          />
        </label>
        {allowLink && (
          <button
            type="button"
            onClick={() => setPasting((v) => !v)}
            className="inline-flex h-[34px] items-center gap-1.5 rounded-[6px] px-2 text-[13px] font-semibold text-[#5b6775] hover:bg-[#eef2f6] hover:text-[#0b1f3a]"
          >
            <Link2 className="h-4 w-4" />
            {pasting ? "Done" : "Paste a link instead"}
          </button>
        )}
      </div>
      <p className="text-[12px] text-[#6b7785]">{allowImages ? "PDF, Word or an image (JPG, PNG, WebP)." : "PDF or Word, up to 25 MB."}</p>
      {error && <p className="text-[12.5px] text-[#b42318]">{error}</p>}
    </div>
  );
}
