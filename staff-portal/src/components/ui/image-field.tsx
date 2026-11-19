"use client";

import { useState } from "react";
import { ImageIcon, Images, Loader2, Upload, X } from "lucide-react";
import type { ModuleKey } from "@/lib/modules";
import { siteAssetUrl } from "@/lib/site-url";
import { uploadFile } from "@/lib/upload-client";
import { PhotoCropDialog } from "@/components/ui/photo-crop";
import { cn } from "@/lib/cn";
import { appPath } from "@/lib/base-path";

export function ImageField({
  module,
  value,
  onChange,
  compact,
  fromGallery = true,
}: {
  module: ModuleKey;
  value: string;
  onChange: (url: string) => void;
  compact?: boolean;
  fromGallery?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);
  const [pending, setPending] = useState<File | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [gallery, setGallery] = useState<{ src: string; title: string }[] | null>(null);

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const data = await uploadFile(module, file);
      setBroken(false);
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
          "flex shrink-0 items-center justify-center overflow-hidden rounded-[8px] border bg-[#f6f8fa] text-[#98a3b1]",
          broken ? "border-[#f0c08a] bg-[#fff8f1]" : "border-[#e3e8ee]",
          compact ? "h-14 w-20" : "h-20 w-28"
        )}
        title={broken ? "This image URL does not load. Re-upload or pick another photo." : undefined}
      >
        {preview && !broken ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            onLoad={() => setBroken(false)}
            onError={() => setBroken(true)}
            key={preview}
          />
        ) : (
          <ImageIcon className="h-6 w-6" />
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        {broken ? (
          <p className="text-[12.5px] font-medium text-[#9a3412]">
            Image missing or broken — re-upload so the website can show it.
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <label
            className={cn(
              "inline-flex h-[34px] cursor-pointer items-center gap-2 rounded-[6px] border border-[#d5dce4] bg-white px-3 text-[13px] font-semibold text-[#0b1f3a] transition-colors hover:bg-[#f4f6f8]",
              uploading && "pointer-events-none opacity-60"
            )}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Uploading…" : "From this device"}
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
          {fromGallery && (
            <button
              type="button"
              disabled={uploading}
              onClick={async () => {
                setGalleryOpen(true);
                if (gallery) return;
                try {
                  const res = await fetch(appPath("/api/organization/photos"), { cache: "no-store" });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error(data.error || "Could not open the gallery.");
                  setGallery(Array.isArray(data.photos) ? data.photos : []);
                } catch (e) {
                  setGallery([]);
                  setError((e as Error).message);
                }
              }}
              className="inline-flex h-[34px] items-center gap-2 rounded-[6px] border border-[#d5dce4] bg-white px-3 text-[13px] font-semibold text-[#0b1f3a] transition-colors hover:bg-[#f4f6f8] disabled:opacity-60"
            >
              <Images className="h-4 w-4" />
              From gallery
            </button>
          )}
          {value && !uploading && (
            <button type="button" className="text-[13px] font-semibold text-[#b42318] hover:underline" onClick={() => onChange("")}>
              Remove
            </button>
          )}
        </div>
        {!compact && (
          <p className="text-[12px] text-[#6b7785]">
            {fromGallery ? "Upload from this device, or choose a photo already in the gallery. JPG, PNG or WebP." : "JPG, PNG or WebP, up to 8 MB."}
          </p>
        )}
        {error && <p className="text-[12.5px] text-[#b42318]">{error}</p>}
      </div>
      {galleryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(39,50,114,0.38)] p-4" onClick={() => window.setTimeout(() => setGalleryOpen(false), 0)}>
          <div className="flex max-h-[80vh] w-full max-w-3xl flex-col bg-white" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#eef1f4] px-4 py-3">
              <p className="m-0 text-[15px] font-semibold text-[#0b1f3a]">Choose from the gallery</p>
              <button type="button" aria-label="Close" onClick={() => window.setTimeout(() => setGalleryOpen(false), 0)} className="text-[#0b1f3a]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 overflow-y-auto p-4 sm:grid-cols-4">
              {gallery === null && <p className="col-span-full text-[13px] text-[#6b7785]">Loading photos…</p>}
              {gallery?.length === 0 && <p className="col-span-full text-[13px] text-[#6b7785]">No gallery photos yet. Add them on the Gallery page.</p>}
              {gallery?.map((image) => (
                <button
                  key={image.src}
                  type="button"
                  onClick={() => {
                    onChange(image.src);
                    setGalleryOpen(false);
                    setError(null);
                  }}
                  className="border border-[#e3e8ee] bg-[#f6f8fa] text-left"
                >
                  <img src={siteAssetUrl(image.src)} alt="" className="h-24 w-full object-cover" />
                  <span className="block truncate px-2 py-1 text-[11px] text-[#0b1f3a]">{image.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
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

/** Opens the published gallery so a photo field can reuse a picture that is already there. */
export function GalleryBrowser({ onPick, label = "From gallery" }: { onPick: (src: string) => void; label?: string }) {
  const [open, setOpen] = useState(false);
  const [gallery, setGallery] = useState<{ src: string; title: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function show() {
    setOpen(true);
    setError(null);
    if (gallery) return;
    try {
      const res = await fetch(appPath("/api/organization/photos"), { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not open the gallery.");
      setGallery(Array.isArray(data.photos) ? data.photos : []);
    } catch (e) {
      setGallery([]);
      setError((e as Error).message);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void show()}
        className="inline-flex h-[34px] items-center gap-2 rounded-[6px] border border-[#d5dce4] bg-white px-3 text-[13px] font-semibold text-[#0b1f3a] transition-colors hover:bg-[#f4f6f8]"
      >
        <Images className="h-4 w-4" />
        {label}
      </button>
      {error && !open && <p className="w-full text-[12.5px] text-[#b42318]">{error}</p>}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(39,50,114,0.38)] p-4" onClick={() => window.setTimeout(() => setOpen(false), 0)}>
          <div className="flex max-h-[80vh] w-full max-w-3xl flex-col bg-white" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#eef1f4] px-4 py-3">
              <p className="m-0 text-[15px] font-semibold text-[#0b1f3a]">Choose from the gallery</p>
              <button type="button" aria-label="Close" onClick={() => window.setTimeout(() => setOpen(false), 0)} className="text-[#0b1f3a]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 overflow-y-auto p-4 sm:grid-cols-4">
              {gallery === null && <p className="col-span-full text-[13px] text-[#6b7785]">Loading photos…</p>}
              {error && <p className="col-span-full text-[13px] text-[#b42318]">{error}</p>}
              {gallery?.length === 0 && !error && <p className="col-span-full text-[13px] text-[#6b7785]">No gallery photos yet. Add them on the Gallery page.</p>}
              {gallery?.map((image) => (
                <button
                  key={image.src}
                  type="button"
                  onClick={() => {
                    onPick(image.src);
                    setOpen(false);
                  }}
                  className="border border-[#e3e8ee] bg-[#f6f8fa] text-left"
                >
                  <img src={siteAssetUrl(image.src)} alt="" className="h-24 w-full object-cover" />
                  <span className="block truncate px-2 py-1 text-[11px] text-[#0b1f3a]">{image.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
