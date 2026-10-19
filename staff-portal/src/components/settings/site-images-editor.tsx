"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/form-bits";
import { useFeedback } from "@/components/ui/feedback";
import { sendJson, uploadFile } from "@/lib/upload-client";
import { PhotoCropDialog } from "@/components/ui/photo-crop";
import { siteAssetUrl } from "@/lib/site-url";
import type { SiteImageSlot } from "@/lib/site-images";

type Override = { slot_id: string; source: string; public_url: string | null; storage_path: string | null };
type LibraryImage = { url: string; storagePath: string | null; label: string };

export function SiteImagesEditor({ canEdit }: { canEdit: boolean }) {
  const { toast } = useFeedback();
  const [slots, setSlots] = useState<SiteImageSlot[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [library, setLibrary] = useState<LibraryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState("");
  const [picking, setPicking] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [crop, setCrop] = useState<{ slotId: string; file: File } | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await sendJson("/api/site-images", "GET");
      const nextSlots: SiteImageSlot[] = data.slots ?? [];
      setSlots(nextSlots);
      setOverrides(data.overrides ?? []);
      setLibrary(data.library ?? []);
      setPage((current) => (nextSlots.some((slot) => slot.page === current) ? current : nextSlots[0]?.page || ""));
    } catch (err) {
      setLoadError((err as Error).message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (loading || !slots.length) return;
    const url = new URL(window.location.href);
    const slotId = url.searchParams.get("slot");
    if (!slotId) return;
    const match = slots.find((slot) => slot.id === slotId);
    if (!match) return;
    url.searchParams.delete("slot");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    setPage(match.page);
    window.setTimeout(() => document.getElementById(`slot-${slotId}`)?.scrollIntoView({ block: "center" }), 50);
  }, [loading, slots]);

  const pages = useMemo(() => {
    const names: string[] = [];
    for (const slot of slots) {
      if (!names.includes(slot.page)) names.push(slot.page);
    }
    return names;
  }, [slots]);

  const visible = slots.filter((slot) => slot.page === page);
  const overrideFor = (id: string) => overrides.find((row) => row.slot_id === id && row.source === "storage" && row.public_url);

  async function save(slotId: string, image: LibraryImage, addToGallery = false) {
    setBusy(slotId);
    try {
      await sendJson("/api/site-images", "POST", {
        slotId,
        source: "storage",
        publicUrl: image.url,
        storagePath: image.storagePath,
        addToGallery,
        title: image.label,
      });
      toast(addToGallery ? "Photo added to the gallery and the website." : "Photo updated on the website.");
      setPicking(null);
      await load();
    } catch (err) {
      toast((err as Error).message, "error");
    }
    setBusy(null);
  }

  async function upload(slotId: string, file: File) {
    setBusy(slotId);
    try {
      const uploaded = await uploadFile("site_settings", file);
      await save(slotId, { url: uploaded.public_url, storagePath: uploaded.storage_path, label: file.name.replace(/\.[a-z0-9]+$/i, "") }, true);
    } catch (err) {
      toast((err as Error).message, "error");
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[#5b6775]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading photos…
      </div>
    );
  }
  if (loadError) return <Notice kind="error">{loadError}</Notice>;

  return (
    <div className="space-y-4">
      {!canEdit && <Notice kind="info">You can look at these photos. Only an administrator can change them.</Notice>}
      <div className="grid items-start gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav className="border border-[#e3e8ee] bg-white" aria-label="Pages">
        {pages.map((name) => {
          const count = slots.filter((slot) => slot.page === name).length;
          return (
            <button
              key={name}
              type="button"
              onClick={() => setPage(name)}
              className={
                name === page
                  ? "flex w-full items-center justify-between bg-[#0b1f3a] px-3 py-2.5 text-left text-[13.5px] font-semibold text-white"
                  : "flex w-full items-center justify-between border-b border-[#eef1f4] bg-white px-3 py-2.5 text-left text-[13.5px] font-semibold text-[#0b1f3a] last:border-b-0"
              }
            >
              <span>{name}</span>
              <span className={name === page ? "text-[12px] text-white/70" : "text-[12px] text-[#6b7785]"}>{count}</span>
            </button>
          );
        })}
      </nav>
      <div className="space-y-3">
        {visible.map((slot) => {
          const stored = overrideFor(slot.id);
          const current = stored?.public_url || slot.src;
          return (
            <article id={`slot-${slot.id}`} key={slot.id} className="flex flex-wrap items-center gap-4 border border-[#e3e8ee] bg-white p-3">
              <img src={siteAssetUrl(current)} alt="" className="h-16 w-28 bg-[#f4f6f8] object-cover" />
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[14px] font-semibold text-[#0b1f3a]">{slot.label}</p>
              </div>
              {canEdit && (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" disabled={busy !== null} onClick={() => setPicking(slot.id)}>
                    {busy === slot.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Choose from gallery
                  </Button>
                  <label className="inline-flex h-10 cursor-pointer items-center gap-2 border border-[#d5dce4] bg-white px-4 text-[14px] font-semibold text-[#0b1f3a]">
                    <Upload className="h-4 w-4" />
                    Upload new
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      disabled={busy !== null}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (file) setCrop({ slotId: slot.id, file });
                      }}
                    />
                  </label>
                </div>
              )}
            </article>
          );
        })}
      </div>
      </div>
      {crop && (
        <PhotoCropDialog
          file={crop.file}
          onCancel={() => setCrop(null)}
          onDone={(file) => {
            const slotId = crop.slotId;
            setCrop(null);
            upload(slotId, file);
          }}
        />
      )}

      {picking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(39,50,114,0.38)] p-4">
          <div className="flex max-h-[80vh] w-full max-w-3xl flex-col bg-white">
            <div className="flex items-center justify-between border-b border-[#eef1f4] px-4 py-3">
              <p className="m-0 text-[15px] font-semibold text-[#0b1f3a]">Choose from the gallery</p>
              <button type="button" aria-label="Close" onClick={() => setPicking(null)} className="text-[#0b1f3a]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 overflow-y-auto p-4 sm:grid-cols-4">
              {library.length === 0 && <p className="col-span-full text-[13px] text-[#6b7785]">No gallery photos yet. Add them on the Gallery page.</p>}
              {library.map((image) => (
                <button
                  key={image.url}
                  type="button"
                  disabled={busy !== null}
                  onClick={() => save(picking, image)}
                  className="border border-[#e3e8ee] bg-[#f6f8fa] text-left"
                >
                  <img src={image.url} alt="" className="h-24 w-full object-cover" />
                  <span className="block truncate px-2 py-1 text-[11px] text-[#0b1f3a]">{image.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
