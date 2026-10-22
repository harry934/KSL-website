"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/form-bits";
import { useFeedback } from "@/components/ui/feedback";
import { sendJson, uploadFile } from "@/lib/upload-client";
import { PhotoCropDialog } from "@/components/ui/photo-crop";
import { siteAssetUrl } from "@/lib/site-url";
import { HERO_MEDIA_LIMIT, HOME_HERO_SLOT, isImagePath, parseHeroMedia, type SiteImageSlot } from "@/lib/site-images";

type Override = { slot_id: string; source: string; public_url: string | null; storage_path: string | null; media?: unknown };
type LibraryImage = { url: string; storagePath: string | null; label: string };
type HeroItem = { kind: "image" | "video"; url: string; storagePath: string | null; label: string };

function slidePlace(index: number) {
  const place = index + 1;
  if (place === 1) return "Plays first";
  if (place === 2) return "Plays second";
  if (place === 3) return "Plays third";
  return `Plays ${place}th`;
}

function heroFrameUrl(url: string, kind: HeroItem["kind"]) {
  const full = siteAssetUrl(url);
  if (kind !== "video" || full.includes("#")) return full;
  return `${full}#t=0.1`;
}

function heroFromOverride(override: Override | undefined) {
  const parsed = parseHeroMedia(override?.media);
  const source = parsed.length
    ? parsed
    : override?.public_url && isImagePath(override.public_url)
      ? [{ kind: "image" as const, public_url: override.public_url, storage_path: override.storage_path }]
      : [];
  return {
    live: parsed.length > 0,
    items: source.map((item) => ({
      kind: item.kind,
      url: item.public_url,
      storagePath: item.storage_path,
      label: item.kind === "video" ? "Video" : "Photo",
    })),
  };
}

export function SiteImagesEditor({ canEdit }: { canEdit: boolean }) {
  const { toast } = useFeedback();
  const [slots, setSlots] = useState<SiteImageSlot[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [heroItems, setHeroItems] = useState<HeroItem[]>([]);
  const [heroListLive, setHeroListLive] = useState(false);
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
      const rows: Override[] = data.overrides ?? [];
      setSlots(nextSlots);
      setOverrides(rows);
      const hero = heroFromOverride(rows.find((row) => row.slot_id === HOME_HERO_SLOT));
      setHeroItems(hero.items);
      setHeroListLive(hero.live);
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

  async function persistHero(next: HeroItem[], gallery?: HeroItem) {
    setBusy(HOME_HERO_SLOT);
    try {
      if (!next.length) {
        await sendJson("/api/site-images", "POST", { slotId: HOME_HERO_SLOT, source: "standard" });
        toast("The original hero film is back on the website.");
      } else {
        await sendJson("/api/site-images", "POST", {
          slotId: HOME_HERO_SLOT,
          source: "storage",
          items: next.map((item) => ({ kind: item.kind, publicUrl: item.url, storagePath: item.storagePath })),
          addToGallery: Boolean(gallery && gallery.kind === "image"),
          publicUrl: gallery?.url,
          storagePath: gallery?.storagePath,
          title: gallery?.label,
        });
        toast("Home hero updated. The website shows one at a time.");
      }
      setPicking(null);
      await load();
    } catch (err) {
      toast((err as Error).message, "error");
    }
    setBusy(null);
  }

  function heroRoom() {
    if (heroItems.length < HERO_MEDIA_LIMIT) return true;
    toast(`The home hero can hold up to ${HERO_MEDIA_LIMIT} photos and videos.`, "error");
    return false;
  }

  async function addHeroImage(file: File) {
    if (!heroRoom()) return;
    setBusy(HOME_HERO_SLOT);
    try {
      const uploaded = await uploadFile("site_settings", file);
      const item: HeroItem = {
        kind: "image",
        url: uploaded.public_url,
        storagePath: uploaded.storage_path,
        label: file.name.replace(/\.[a-z0-9]+$/i, "") || "Photo",
      };
      await persistHero([...heroItems, item], item);
    } catch (err) {
      toast((err as Error).message, "error");
      setBusy(null);
    }
  }

  async function addHeroVideo(file: File) {
    const named = /\.(mp4|webm|mov|m4v)$/i.test(file.name);
    const typed = file.type === "video/mp4" || file.type === "video/webm" || file.type === "video/quicktime" || file.type === "video/x-quicktime" || ((file.type === "" || file.type === "application/octet-stream") && named);
    if (!typed) {
      toast("Use an MP4, WebM, or MOV video.", "error");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast("Video is too large (max 50 MB).", "error");
      return;
    }
    if (!heroRoom()) return;
    setBusy(HOME_HERO_SLOT);
    try {
      const uploaded = await uploadFile("site_settings", file, { "x-ksl-hero": "1" });
      await persistHero([
        ...heroItems,
        {
          kind: "video",
          url: uploaded.public_url,
          storagePath: uploaded.storage_path,
          label: file.name.replace(/\.[a-z0-9]+$/i, "") || "Video",
        },
      ]);
    } catch (err) {
      toast((err as Error).message, "error");
      setBusy(null);
    }
  }

  function appendHeroPhoto(image: LibraryImage) {
    if (heroItems.some((item) => item.url === image.url)) {
      toast("That photo is already in the home hero.", "error");
      return;
    }
    if (!heroRoom()) return;
    persistHero([...heroItems, { kind: "image", url: image.url, storagePath: image.storagePath, label: image.label }]);
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
          if (slot.id === HOME_HERO_SLOT) {
            return (
              <article id={`slot-${slot.id}`} key={slot.id} className="border border-[#e3e8ee] bg-white p-3">
                <p className="m-0 text-[14px] font-semibold text-[#0b1f3a]">{slot.label}</p>
                <p className="mb-3 mt-1 text-[13px] text-[#5b6775]">
                  {heroListLive
                    ? "The homepage shows these one at a time, in this order. The dots on the hero follow the same order. Remove them all to bring back the original film."
                    : heroItems.length
                      ? "This photo is already on the hero, under the original film. Add a video or another photo and the homepage will show your list one at a time instead."
                      : "The homepage is using its original film. Add photos, videos, or both, and it will show them one at a time."}
                </p>
                <p className="m-0 mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#6b7785]">Playback order</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {heroItems.map((item, index) => (
                    <div key={`${item.url}-${index}`} className="border border-[#eef1f4] p-2">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="m-0 text-[13px] font-semibold text-[#0b1f3a]">
                          {index + 1}. {item.kind === "video" ? "Video" : "Photo"}
                        </p>
                        <p className="m-0 text-[12px] text-[#0b1f3a]">{slidePlace(index)}</p>
                      </div>
                      {item.kind === "video" ? (
                        <video src={heroFrameUrl(item.url, item.kind)} muted controls playsInline preload="metadata" className="mb-2 block h-40 w-full bg-[#0b1f3a] object-cover" />
                      ) : (
                        <img src={heroFrameUrl(item.url, item.kind)} alt="" className="mb-2 block h-40 w-full bg-[#f4f6f8] object-cover" />
                      )}
                      <p className="m-0 mb-2 truncate text-[12px] text-[#6b7785]">{item.label}</p>
                      {canEdit && (
                        <div className="flex gap-1">
                          <Button type="button" variant="secondary" size="sm" aria-label="Move earlier" disabled={busy !== null || index === 0} onClick={() => {
                            const next = heroItems.slice();
                            const [moved] = next.splice(index, 1);
                            next.splice(index - 1, 0, moved);
                            persistHero(next);
                          }}>
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="secondary" size="sm" aria-label="Move later" disabled={busy !== null || index === heroItems.length - 1} onClick={() => {
                            const next = heroItems.slice();
                            const [moved] = next.splice(index, 1);
                            next.splice(index + 1, 0, moved);
                            persistHero(next);
                          }}>
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="danger" size="sm" aria-label="Remove" disabled={busy !== null} onClick={() => persistHero(heroItems.filter((_, itemIndex) => itemIndex !== index))}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {canEdit && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <label className="inline-flex h-10 cursor-pointer items-center gap-2 border border-[#d5dce4] bg-white px-4 text-[14px] font-semibold text-[#0b1f3a]">
                      <Upload className="h-4 w-4" />
                      Upload photo
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
                    <label className="inline-flex h-10 cursor-pointer items-center gap-2 border border-[#d5dce4] bg-white px-4 text-[14px] font-semibold text-[#0b1f3a]">
                      <Upload className="h-4 w-4" />
                      Upload video
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v"
                        className="sr-only"
                        disabled={busy !== null}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          if (file) addHeroVideo(file);
                        }}
                      />
                    </label>
                    <Button type="button" variant="secondary" disabled={busy !== null} onClick={() => setPicking(slot.id)}>
                      {busy === slot.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Choose from gallery
                    </Button>
                    {heroItems.length > 0 && (
                      <Button type="button" variant="ghost" disabled={busy !== null} onClick={() => persistHero([])}>
                        Use the original film
                      </Button>
                    )}
                  </div>
                )}
              </article>
            );
          }
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
            if (slotId === HOME_HERO_SLOT) addHeroImage(file);
            else upload(slotId, file);
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
                  onClick={() => (picking === HOME_HERO_SLOT ? appendHeroPhoto(image) : save(picking, image))}
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
