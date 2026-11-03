"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Crop, GripVertical, Loader2, Scissors, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Notice, Select } from "@/components/ui/form-bits";
import { useFeedback } from "@/components/ui/feedback";
import { sendJson, uploadFile } from "@/lib/upload-client";
import { PhotoCropDialog } from "@/components/ui/photo-crop";
import { VideoCropDialog } from "@/components/ui/video-crop";
import { VideoTrimDialog } from "@/components/ui/video-trim";
import { heroFrameOffset, type HeroCrop, type HeroTrim } from "@/lib/hero-frame";
import { siteAssetUrl } from "@/lib/site-url";
import { HERO_MEDIA_LIMIT, HOME_HERO_SLOT, isImagePath, parseHeroMedia, type SiteImageSlot } from "@/lib/site-images";

type Override = { slot_id: string; source: string; public_url: string | null; storage_path: string | null; media?: unknown };
type LibraryImage = { url: string; storagePath: string | null; label: string };
type HeroItem = {
  kind: "image" | "video";
  url: string;
  storagePath: string | null;
  label: string;
  crop: HeroCrop | null;
  trim: HeroTrim | null;
  title: string;
  subtitle: string;
  buttonLabel: string;
  buttonUrl: string;
};

const DEFAULT_HERO_COPY = {
  title: "Catalyzing Shipbuilding Industry",
  subtitle: "From Mombasa and Kisumu, we build and refit the vessels that keep Eastern Africa moving.",
  buttonLabel: "Read our story",
  buttonUrl: "about.html",
};

const HERO_PAGES = [
  { value: "index.html", label: "Home" },
  { value: "about.html", label: "About" },
  { value: "board.html", label: "Board" },
  { value: "organization.html", label: "Organization" },
  { value: "service.html", label: "Services" },
  { value: "products.html", label: "Products" },
  { value: "project.html", label: "Projects" },
  { value: "news.html", label: "News" },
  { value: "videos.html", label: "Gallery" },
  { value: "downloads.html", label: "Downloads" },
  { value: "careers.html", label: "Careers" },
  { value: "csr.html", label: "CSR" },
  { value: "sustainability.html", label: "Sustainability" },
  { value: "faq.html", label: "FAQ" },
  { value: "contact.html", label: "Contact" },
];

function clock(seconds: number) {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function heroFrameUrl(url: string, kind: HeroItem["kind"]) {
  const full = siteAssetUrl(url);
  if (kind !== "video" || full.includes("#")) return full;
  return `${full}#t=0.1`;
}

function HeroPreview({ item, large }: { item: HeroItem; large?: boolean }) {
  const frame = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const size = large ? "h-[100px] w-[160px]" : "h-24 w-40";
  const place = useCallback(() => {
    const box = frame.current;
    const clip = video.current;
    if (!box || !clip || !item.crop || !clip.videoWidth || !clip.videoHeight) return;
    const next = heroFrameOffset(box.clientWidth, box.clientHeight, clip.videoWidth, clip.videoHeight, item.crop);
    clip.style.position = "absolute";
    clip.style.width = `${next.width}px`;
    clip.style.height = `${next.height}px`;
    clip.style.left = `${next.left}px`;
    clip.style.top = `${next.top}px`;
  }, [item.crop]);

  if (item.kind !== "video") {
    return <img src={heroFrameUrl(item.url, item.kind)} alt="" className={`block ${size} bg-[#f4f6f8] object-cover`} />;
  }
  return (
    <div ref={frame} className={`relative ${size} overflow-hidden bg-[#0b1f3a]`}>
      <video
        ref={video}
        src={heroFrameUrl(item.url, item.kind)}
        muted
        playsInline
        preload="metadata"
        onLoadedMetadata={(event) => {
          const clip = event.currentTarget;
          if (clip.currentTime < 0.1) clip.currentTime = 0.1;
          place();
        }}
        draggable={false}
        className={item.crop ? "absolute max-w-none" : "block h-full w-full object-cover"}
      />
    </div>
  );
}

function heroFromOverride(override: Override | undefined) {
  const parsed = parseHeroMedia(override?.media);
  const source =
    parsed.length > 0
      ? parsed
      : override?.public_url && isImagePath(override.public_url)
        ? parseHeroMedia([
            {
              kind: "image",
              public_url: override.public_url,
              storage_path: override.storage_path,
              crop: null,
              trim: null,
              ...DEFAULT_HERO_COPY,
            },
          ])
        : [];
  return {
    live: parsed.length > 0,
    items: source.map((item) => ({
      kind: item.kind,
      url: item.public_url,
      storagePath: item.storage_path,
      label: item.kind === "video" ? "Video" : "Photo",
      crop: item.crop,
      trim: item.trim,
      title: item.title || DEFAULT_HERO_COPY.title,
      subtitle: item.subtitle || DEFAULT_HERO_COPY.subtitle,
      buttonLabel: item.buttonLabel || DEFAULT_HERO_COPY.buttonLabel,
      buttonUrl: item.buttonUrl || DEFAULT_HERO_COPY.buttonUrl,
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
  const [videoCrop, setVideoCrop] = useState<number | null>(null);
  const [videoTrim, setVideoTrim] = useState<number | null>(null);
  const [lift, setLift] = useState<{ from: number; over: number; stride: number } | null>(null);
  const [customLinkFor, setCustomLinkFor] = useState<number | null>(null);
  const [selectedHeroIndex, setSelectedHeroIndex] = useState(0);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const liftRef = useRef<{ from: number; over: number; startX: number; stride: number; node: HTMLElement; moved: boolean } | null>(null);

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
      setSelectedHeroIndex((current) => (hero.items.length ? Math.min(current, hero.items.length - 1) : 0));
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
    setSelectedSlotId(slotId);
    window.setTimeout(() => document.getElementById(`slot-${slotId}`)?.scrollIntoView({ block: "center" }), 50);
  }, [loading, slots]);

  const pages = useMemo(() => {
    const names: string[] = [];
    for (const slot of slots) {
      if (!names.includes(slot.page)) names.push(slot.page);
    }
    return names;
  }, [slots]);

  const visible = useMemo(() => slots.filter((slot) => slot.page === page), [slots, page]);
  const pageSlots = useMemo(() => visible.filter((slot) => slot.id !== HOME_HERO_SLOT), [visible]);
  const heroSlot = visible.find((slot) => slot.id === HOME_HERO_SLOT);

  useEffect(() => {
    const ids = slots.filter((slot) => slot.page === page && slot.id !== HOME_HERO_SLOT).map((slot) => slot.id);
    if (!ids.length) {
      setSelectedSlotId(null);
      return;
    }
    setSelectedSlotId((current) => (current && ids.includes(current) ? current : ids[0]));
  }, [page, slots]);

  const overrideFor = (id: string) => overrides.find((row) => row.slot_id === id && row.source === "storage" && row.public_url);
  const selectedHero = heroItems[selectedHeroIndex] ?? null;
  const customLink =
    selectedHero != null &&
    (customLinkFor === selectedHeroIndex ||
      Boolean(selectedHero.buttonUrl && !HERO_PAGES.some((entry) => entry.value === selectedHero.buttonUrl)));

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
          items: next.map((item) => ({
            kind: item.kind,
            publicUrl: item.url,
            storagePath: item.storagePath,
            crop: item.kind === "video" ? item.crop : null,
            trim: item.kind === "video" ? item.trim : null,
            title: item.title,
            subtitle: item.subtitle,
            buttonLabel: item.buttonLabel,
            buttonUrl: item.buttonUrl,
          })),
          addToGallery: Boolean(gallery && gallery.kind === "image"),
          publicUrl: gallery?.url,
          storagePath: gallery?.storagePath,
          title: gallery?.label,
        });
        toast("Home hero updated. The website shows one at a time.");
      }
      setHeroItems(next);
      setHeroListLive(next.length > 0);
      setSelectedHeroIndex((current) => (next.length ? Math.min(current, next.length - 1) : 0));
      setPicking(null);
      await load();
    } catch (err) {
      toast((err as Error).message, "error");
      await load();
    }
    setBusy(null);
  }

  function patchHero(index: number, patch: Partial<HeroItem>) {
    setHeroItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  async function saveHeroCopy(index: number, patch?: Partial<HeroItem>) {
    const next = heroItems.map((item, itemIndex) => (itemIndex === index && patch ? { ...item, ...patch } : item));
    if (!next[index]) return;
    if (patch) setHeroItems(next);
    await persistHero(next);
  }

  async function removeHero(index: number) {
    const next = heroItems.filter((_, itemIndex) => itemIndex !== index);
    setHeroItems(next);
    setHeroListLive(next.length > 0);
    setSelectedHeroIndex((current) => {
      if (!next.length) return 0;
      if (current > index) return current - 1;
      if (current === index) return Math.min(index, next.length - 1);
      return current;
    });
    await persistHero(next);
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
        crop: null,
        trim: null,
        ...DEFAULT_HERO_COPY,
      };
      const next = [...heroItems, item];
      setSelectedHeroIndex(next.length - 1);
      await persistHero(next, item);
    } catch (err) {
      toast((err as Error).message, "error");
      setBusy(null);
    }
  }

  async function addHeroVideo(file: File) {
    const named = /\.(mp4|webm|mov|m4v)$/i.test(file.name);
    const typed =
      file.type === "video/mp4" ||
      file.type === "video/webm" ||
      file.type === "video/quicktime" ||
      file.type === "video/x-quicktime" ||
      ((file.type === "" || file.type === "application/octet-stream") && named);
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
      const next = [
        ...heroItems,
        {
          kind: "video" as const,
          url: uploaded.public_url,
          storagePath: uploaded.storage_path,
          label: file.name.replace(/\.[a-z0-9]+$/i, "") || "Video",
          crop: null,
          trim: null,
          ...DEFAULT_HERO_COPY,
        },
      ];
      setSelectedHeroIndex(next.length - 1);
      await persistHero(next);
    } catch (err) {
      toast((err as Error).message, "error");
      setBusy(null);
    }
  }

  function moveHero(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= heroItems.length || to >= heroItems.length) return;
    const next = heroItems.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setSelectedHeroIndex(to);
    persistHero(next);
  }

  function stripNudge(index: number) {
    if (!lift || index === lift.from) return 0;
    if (lift.from < lift.over && index > lift.from && index <= lift.over) return -lift.stride;
    if (lift.from > lift.over && index < lift.from && index >= lift.over) return lift.stride;
    return 0;
  }

  function startLift(event: React.PointerEvent<HTMLElement>, index: number) {
    if (!canEdit || busy !== null || event.button !== 0) return;
    const node = event.currentTarget;
    const stride = node.getBoundingClientRect().width + 12;
    node.setPointerCapture(event.pointerId);
    liftRef.current = { from: index, over: index, startX: event.clientX, stride, node, moved: false };
    setLift({ from: index, over: index, stride });
    setSelectedHeroIndex(index);
  }

  function moveLift(event: React.PointerEvent<HTMLElement>) {
    const drag = liftRef.current;
    if (!drag || event.currentTarget !== drag.node) return;
    const dx = event.clientX - drag.startX;
    if (Math.abs(dx) > 4) drag.moved = true;
    drag.node.style.transform = `translateX(${dx}px)`;
    drag.node.style.zIndex = "4";
    drag.node.style.boxShadow = "0 12px 28px rgba(11,31,58,.18)";
    const next = Math.max(0, Math.min(heroItems.length - 1, drag.from + Math.round(dx / drag.stride)));
    if (next !== drag.over) {
      drag.over = next;
      setLift({ from: drag.from, over: next, stride: drag.stride });
    }
  }

  function endLift() {
    const drag = liftRef.current;
    if (!drag) return;
    const target = drag.over;
    const from = drag.from;
    const moved = drag.moved;
    drag.node.style.transform = "";
    drag.node.style.zIndex = "";
    drag.node.style.boxShadow = "";
    liftRef.current = null;
    setLift(null);
    if (moved && target !== from) moveHero(from, target);
  }

  function appendHeroPhoto(image: LibraryImage) {
    if (heroItems.some((item) => item.url === image.url)) {
      toast("That photo is already in the home hero.", "error");
      return;
    }
    if (!heroRoom()) return;
    const next = [
      ...heroItems,
      { kind: "image" as const, url: image.url, storagePath: image.storagePath, label: image.label, crop: null, trim: null, ...DEFAULT_HERO_COPY },
    ];
    setSelectedHeroIndex(next.length - 1);
    persistHero(next);
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

  const focusedSlot = pageSlots.find((slot) => slot.id === selectedSlotId) ?? null;
  const focusedUrl = focusedSlot ? overrideFor(focusedSlot.id)?.public_url || focusedSlot.src : null;

  return (
    <div className="space-y-4">
      {!canEdit && <Notice kind="info">You can look at these photos. Only an administrator can change them.</Notice>}
      <div className="grid items-start gap-4 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav className="sticky top-3 border border-[#e3e8ee] bg-white" aria-label="Pages">
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

        <div className="space-y-4">
          {heroSlot && (
            <section id={`slot-${heroSlot.id}`} className="border border-[#e3e8ee] bg-white p-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="m-0 text-[15px] font-bold text-[#0b1f3a]">{heroSlot.label}</h2>
                  <p className="mb-0 mt-1 text-[13px] text-[#5b6775]">
                    {heroListLive
                      ? "Drag slides to reorder. Select one to edit its text."
                      : heroItems.length
                        ? "Add another slide to replace the original film on the homepage."
                        : "Using the original film. Add a photo or video to take over."}
                  </p>
                </div>
                {heroItems.length > 0 && (
                  <p className="m-0 text-[12.5px] text-[#6b7785]">
                    Slide {selectedHeroIndex + 1} of {heroItems.length}
                  </p>
                )}
              </div>

              {heroItems.length > 0 ? (
                <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                  {heroItems.map((item, index) => {
                    const nudge = stripNudge(index);
                    const lifted = lift?.from === index;
                    const selected = selectedHeroIndex === index;
                    return (
                      <div
                        key={`${item.kind}-${item.url}-${index}`}
                        role="button"
                        tabIndex={0}
                        aria-label={`Slide ${index + 1}, ${item.kind === "video" ? "video" : "photo"}`}
                        aria-pressed={selected}
                        onClick={() => setSelectedHeroIndex(index)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedHeroIndex(index);
                          } else if (canEdit && event.key === "ArrowLeft") {
                            event.preventDefault();
                            moveHero(index, index - 1);
                          } else if (canEdit && event.key === "ArrowRight") {
                            event.preventDefault();
                            moveHero(index, index + 1);
                          }
                        }}
                        onPointerDown={(event) => startLift(event, index)}
                        onPointerMove={moveLift}
                        onPointerUp={endLift}
                        onPointerCancel={endLift}
                        className={`relative shrink-0 overflow-hidden border-2 text-left transition ${
                          selected ? "border-[#0b1f3a]" : "border-transparent hover:border-[#c5ced9]"
                        } ${canEdit ? "cursor-grab touch-none" : "cursor-pointer"} ${lifted ? "z-[4] cursor-grabbing" : ""}`}
                        style={lifted ? undefined : { transform: nudge ? `translateX(${nudge}px)` : undefined, transition: "transform 160ms ease" }}
                      >
                        <HeroPreview item={item} large />
                        <span className="flex items-center gap-1 bg-[#f6f8fa] px-2 py-1.5">
                          {canEdit && <GripVertical className="h-3.5 w-3.5 shrink-0 text-[#6b7785]" />}
                          <span className="truncate text-[12px] font-semibold text-[#0b1f3a]">
                            {index + 1}. {item.kind === "video" ? "Video" : "Photo"}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 flex h-[100px] items-center justify-center border border-dashed border-[#d5dce4] bg-[#f6f8fa] text-[13px] text-[#6b7785]">
                  No custom slides yet
                </div>
              )}

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
                        if (file) setCrop({ slotId: heroSlot.id, file });
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
                  <Button type="button" variant="secondary" disabled={busy !== null} onClick={() => setPicking(heroSlot.id)}>
                    {busy === heroSlot.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Choose from gallery
                  </Button>
                  {heroItems.length > 0 && (
                    <Button type="button" variant="ghost" disabled={busy !== null} onClick={() => persistHero([])}>
                      Use the original film
                    </Button>
                  )}
                </div>
              )}

              {selectedHero && (
                <div className="mt-4 border-t border-[#eef1f4] pt-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="m-0 text-[13.5px] font-semibold text-[#0b1f3a]">
                      Editing slide {selectedHeroIndex + 1}
                      {selectedHero.crop ? " · Cropped" : ""}
                      {selectedHero.trim ? ` · ${clock(selectedHero.trim.start)}–${clock(selectedHero.trim.end)}` : ""}
                    </p>
                    {canEdit && (
                      <div className="flex flex-wrap gap-1">
                        {selectedHero.kind === "video" && (
                          <>
                            <Button type="button" variant="secondary" size="sm" disabled={busy !== null} onClick={() => setVideoCrop(selectedHeroIndex)} aria-label="Crop">
                              <Crop className="h-4 w-4" />
                              Crop
                            </Button>
                            <Button type="button" variant="secondary" size="sm" disabled={busy !== null} onClick={() => setVideoTrim(selectedHeroIndex)} aria-label="Trim">
                              <Scissors className="h-4 w-4" />
                              Trim
                            </Button>
                          </>
                        )}
                        <Button type="button" variant="danger" size="sm" disabled={busy !== null} onClick={() => removeHero(selectedHeroIndex)} aria-label="Remove">
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Field label="Title">
                      <Input
                        value={selectedHero.title}
                        disabled={!canEdit || busy !== null}
                        maxLength={90}
                        onChange={(event) => patchHero(selectedHeroIndex, { title: event.target.value })}
                        onBlur={() => canEdit && saveHeroCopy(selectedHeroIndex)}
                      />
                    </Field>
                    <Field label="Button text">
                      <Input
                        value={selectedHero.buttonLabel}
                        disabled={!canEdit || busy !== null}
                        maxLength={40}
                        onChange={(event) => patchHero(selectedHeroIndex, { buttonLabel: event.target.value })}
                        onBlur={() => canEdit && saveHeroCopy(selectedHeroIndex)}
                      />
                    </Field>
                    <Field label="Subtitle" className="sm:col-span-2">
                      <Input
                        value={selectedHero.subtitle}
                        disabled={!canEdit || busy !== null}
                        maxLength={220}
                        onChange={(event) => patchHero(selectedHeroIndex, { subtitle: event.target.value })}
                        onBlur={() => canEdit && saveHeroCopy(selectedHeroIndex)}
                      />
                    </Field>
                    <Field label="Button link" hint="Pick a page on this site, or a web address of your own." className="sm:col-span-2">
                      <Select
                        value={customLink ? "custom" : selectedHero.buttonUrl}
                        disabled={!canEdit || busy !== null}
                        onChange={(event) => {
                          const value = event.target.value;
                          if (value === "custom") {
                            setCustomLinkFor(selectedHeroIndex);
                            if (HERO_PAGES.some((entry) => entry.value === selectedHero.buttonUrl)) {
                              patchHero(selectedHeroIndex, { buttonUrl: "" });
                            }
                            return;
                          }
                          setCustomLinkFor(null);
                          if (canEdit) void saveHeroCopy(selectedHeroIndex, { buttonUrl: value });
                          else patchHero(selectedHeroIndex, { buttonUrl: value });
                        }}
                      >
                        <option value="">Choose a page</option>
                        {HERO_PAGES.map((entry) => (
                          <option key={entry.value} value={entry.value}>
                            {entry.label}
                          </option>
                        ))}
                        <option value="custom">Custom web address</option>
                      </Select>
                      {customLink ? (
                        <Input
                          className="mt-2"
                          value={selectedHero.buttonUrl}
                          disabled={!canEdit || busy !== null}
                          maxLength={240}
                          autoCapitalize="none"
                          spellCheck={false}
                          placeholder="https://"
                          onChange={(event) => patchHero(selectedHeroIndex, { buttonUrl: event.target.value.trim() })}
                          onBlur={() => canEdit && saveHeroCopy(selectedHeroIndex)}
                        />
                      ) : null}
                    </Field>
                  </div>
                </div>
              )}
            </section>
          )}

          {pageSlots.length > 0 && (
            <section className="border border-[#e3e8ee] bg-white p-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="m-0 text-[15px] font-bold text-[#0b1f3a]">{page} images</h2>
                  <p className="mb-0 mt-1 text-[13px] text-[#5b6775]">Select a photo, then replace it.</p>
                </div>
                {focusedSlot && canEdit && (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" disabled={busy !== null} onClick={() => setPicking(focusedSlot.id)}>
                      {busy === focusedSlot.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
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
                          if (file) setCrop({ slotId: focusedSlot.id, file });
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>

              {focusedSlot && focusedUrl && (
                <p className="mt-3 mb-0 text-[12.5px] text-[#5b6775]">
                  Selected: <span className="font-semibold text-[#0b1f3a]">{focusedSlot.label}</span>
                </p>
              )}

              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {pageSlots.map((slot) => {
                  const current = overrideFor(slot.id)?.public_url || slot.src;
                  const selected = selectedSlotId === slot.id;
                  return (
                    <button
                      key={slot.id}
                      id={`slot-${slot.id}`}
                      type="button"
                      onClick={() => setSelectedSlotId(slot.id)}
                      className={`overflow-hidden border-2 bg-[#f6f8fa] text-left transition ${
                        selected ? "border-[#0b1f3a]" : "border-transparent hover:border-[#c5ced9]"
                      }`}
                    >
                      <img src={siteAssetUrl(current)} alt="" className="aspect-[16/10] w-full bg-[#eef1f4] object-cover" />
                      <span className="block truncate px-2.5 py-2 text-[12.5px] font-semibold text-[#0b1f3a]">{slot.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {!heroSlot && pageSlots.length === 0 && (
            <p className="border border-[#e3e8ee] bg-white px-4 py-8 text-center text-[14px] text-[#6b7785]">No images on this page.</p>
          )}
        </div>
      </div>

      {videoTrim !== null && heroItems[videoTrim]?.kind === "video" && (
        <VideoTrimDialog
          url={siteAssetUrl(heroItems[videoTrim].url)}
          initial={heroItems[videoTrim].trim}
          onCancel={() => setVideoTrim(null)}
          onDone={(nextTrim) => {
            const index = videoTrim;
            setVideoTrim(null);
            persistHero(heroItems.map((item, itemIndex) => (itemIndex === index ? { ...item, trim: nextTrim } : item)));
          }}
        />
      )}
      {videoCrop !== null && heroItems[videoCrop]?.kind === "video" && (
        <VideoCropDialog
          url={siteAssetUrl(heroItems[videoCrop].url)}
          initial={heroItems[videoCrop].crop}
          onCancel={() => setVideoCrop(null)}
          onDone={(nextCrop) => {
            const index = videoCrop;
            setVideoCrop(null);
            persistHero(heroItems.map((item, itemIndex) => (itemIndex === index ? { ...item, crop: nextCrop } : item)));
          }}
        />
      )}
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
