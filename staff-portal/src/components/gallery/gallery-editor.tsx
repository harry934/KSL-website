"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GripVertical, Loader2, Pencil, Plus, Star, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, Field, FieldGrid, FormSection, Switch, Textarea } from "@/components/ui/form-bits";
import { useFeedback } from "@/components/ui/feedback";
import { useCan } from "@/components/portal/session-context";
import { GALLERY_CATEGORIES, photoSrc, youtubeIdFrom, type GalleryRow, type GalleryVideoRow } from "@/lib/gallery";
import { DRAG_FROM, useLiveDrag } from "@/components/ui/live-drag";
import { reorderItem } from "@/lib/list-utils";
import { siteAssetUrl } from "@/lib/site-url";
import { sendJson, uploadFile, awaitingReview, DRAFT_SAVED } from "@/lib/upload-client";
import { PhotoCropDialog } from "@/components/ui/photo-crop";
import { cn } from "@/lib/cn";

type VideoDraft = { id?: string; link: string; title: string; caption: string; featured: boolean; status: string; sort_order: number };

const EMPTY_VIDEO: VideoDraft = { link: "", title: "", caption: "", featured: false, status: "published", sort_order: 0 };

export function GalleryEditor() {
  const { toast, confirm } = useFeedback();
  const canPublish = useCan("gallery", "publish");
  const canDelete = useCan("gallery", "delete");

  const [photos, setPhotos] = useState<GalleryRow[]>([]);
  const [videos, setVideos] = useState<GalleryVideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [place, setPlace] = useState("any");
  const [openId, setOpenId] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [cropQueue, setCropQueue] = useState<File[]>([]);
  const batch = useRef({ total: 0, added: 0, held: false });
  const [video, setVideo] = useState<VideoDraft | null>(null);
  const [savingVideo, setSavingVideo] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/gallery");
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setPhotos(data.photos ?? []);
      setVideos(data.videos ?? []);
    } else {
      toast(data.error ?? "Could not load the gallery.", "error");
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (loading) return;
    const url = new URL(window.location.href);
    const id = url.searchParams.get("edit");
    if (!id) return;
    url.searchParams.delete("edit");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    const photo = photos.find((row) => row.id === id);
    if (photo) {
      setPlace("any");
      setOpenId(photo.id);
    }
    const clip = videos.find((row) => row.id === id);
    if (clip) {
      setVideo({
        id: clip.id,
        link: `https://www.youtube.com/watch?v=${clip.youtube_id}`,
        title: clip.title ?? "",
        caption: clip.caption ?? "",
        featured: clip.featured,
        status: clip.status,
        sort_order: clip.sort_order,
      });
    }
    window.setTimeout(() => document.getElementById(`gallery-${id}`)?.scrollIntoView({ block: "center" }), 50);
  }, [loading, photos, videos]);

  const shown = useMemo(() => (place === "any" ? photos : photos.filter((p) => (p.category || "all") === place)), [photos, place]);

  async function savePhoto(row: GalleryRow, message?: string) {
    try {
      const saved = await sendJson("/api/gallery", "POST", row);
      if (awaitingReview(saved)) {
        toast(DRAFT_SAVED);
        if (saved.held) load();
      } else if (message) toast(message);
    } catch (e) {
      toast((e as Error).message, "error");
      load();
    }
  }

  function patchPhoto(id: string, patch: Partial<GalleryRow>, persist = true, message?: string) {
    const row = photos.find((p) => p.id === id);
    if (!row) return;
    const next = { ...row, ...patch };
    setPhotos((list) => list.map((p) => (p.id === id ? next : p)));
    if (persist) savePhoto(next, message);
  }

  function queueUploads(files: FileList | null) {
    if (!files?.length || cropQueue.length) return;
    const list = Array.from(files).filter((file) => /^image\/(jpeg|png|webp)$/.test(file.type));
    if (!list.length) {
      toast("Choose a JPG, PNG, or WebP photo.", "error");
      return;
    }
    batch.current = { total: list.length, added: 0, held: false };
    setCropQueue(list);
  }

  function finishQueued(uploaded: boolean) {
    if (uploaded) batch.current.added += 1;
    setProgress(null);
    setCropQueue((current) => current.slice(1));
  }

  useEffect(() => {
    if (cropQueue.length > 0 || batch.current.total === 0) return;
    const added = batch.current.added;
    const held = batch.current.held;
    batch.current = { total: 0, added: 0, held: false };
    if (!added) return;
    toast(held ? DRAFT_SAVED : added === 1 ? "Photo added." : `${added} photos added.`);
    void load();
  }, [cropQueue, load, toast]);

  async function acceptQueued(cropped: File) {
    const source = cropQueue[0];
    if (!source) return;
    const index = batch.current.total - cropQueue.length + 1;
    setProgress(batch.current.total > 1 ? `Uploading ${index} of ${batch.current.total}…` : "Uploading…");
    try {
      const up = await uploadFile("gallery", cropped);
      const order = photos.reduce((max, p) => Math.max(max, p.sort_order), 0) + batch.current.added + 1;
      const saved = await sendJson("/api/gallery", "POST", {
        title: "",
        alt_text: "",
        category: place === "any" ? "all" : place,
        public_url: up.public_url,
        storage_path: up.storage_path,
        sort_order: order,
        status: "published",
      });
      if (awaitingReview(saved)) batch.current.held = true;
      finishQueued(true);
    } catch (e) {
      toast(`${source.name}: ${(e as Error).message}`, "error");
      finishQueued(false);
    }
  }

  async function removePhoto(row: GalleryRow) {
    const ok = await confirm({
      title: "Remove this photo?",
      message: "It leaves the Gallery page and goes to the recycle bin.",
      confirmLabel: "Remove photo",
      danger: true,
    });
    if (!ok) return;
    try {
      await sendJson(`/api/gallery?id=${encodeURIComponent(row.id)}`, "DELETE");
      setPhotos((list) => list.filter((p) => p.id !== row.id));
      setOpenId((current) => (current === row.id ? null : current));
      toast("Photo moved to the recycle bin.");
      load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  function startVideo(row?: GalleryVideoRow) {
    setVideo(
      row
        ? {
            id: row.id,
            link: `https://www.youtube.com/watch?v=${row.youtube_id}`,
            title: row.title,
            caption: row.caption ?? "",
            featured: row.featured,
            status: row.status,
            sort_order: row.sort_order,
          }
        : { ...EMPTY_VIDEO, status: canPublish ? "published" : "draft", sort_order: videos.length }
    );
  }

  async function saveVideo(e: React.FormEvent) {
    e.preventDefault();
    if (!video) return;
    const youtubeId = youtubeIdFrom(video.link);
    if (!youtubeId) {
      toast("That does not look like a YouTube link. Copy the address from the video's Share button.", "error");
      return;
    }
    if (!video.title.trim()) {
      toast("Give the video a title.", "error");
      return;
    }
    setSavingVideo(true);
    try {
      const saved = await sendJson("/api/gallery", "POST", {
        type: "video",
        id: video.id,
        youtube_id: youtubeId,
        title: video.title,
        caption: video.caption,
        featured: video.featured,
        status: video.status,
        sort_order: video.sort_order,
      });
      toast(awaitingReview(saved) ? DRAFT_SAVED : video.id ? "Video saved." : "Video added.");
      setVideo(null);
      load();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSavingVideo(false);
    }
  }

  async function saveVideoRow(row: GalleryVideoRow) {
    await sendJson("/api/gallery", "POST", { ...row, type: "video" });
  }

  async function toggleVideo(row: GalleryVideoRow, status: string) {
    setVideos((list) => list.map((v) => (v.id === row.id ? { ...v, status } : v)));
    try {
      await saveVideoRow({ ...row, status });
      toast(status === "published" ? "Video is now on the website." : "Video hidden from the website.");
    } catch (e) {
      toast((e as Error).message, "error");
      load();
    }
  }

  async function moveVideo(from: number, to: number) {
    const next = reorderItem(videos, from, to).map((v, i) => ({ ...v, sort_order: i }));
    setVideos(next);
    try {
      await Promise.all(next.map((v) => saveVideoRow(v)));
    } catch (e) {
      toast((e as Error).message, "error");
      load();
    }
  }

  const videoDrag = useLiveDrag(moveVideo);

  async function removeVideo(row: GalleryVideoRow) {
    const ok = await confirm({
      title: "Remove this video?",
      message: `"${row.title}" leaves the website and goes to the recycle bin. The film stays on YouTube.`,
      confirmLabel: "Remove video",
      danger: true,
    });
    if (!ok) return;
    try {
      await sendJson(`/api/gallery?id=${encodeURIComponent(row.id)}&type=video`, "DELETE");
      setVideos((list) => list.filter((v) => v.id !== row.id));
      toast("Video moved to the recycle bin.");
      load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[14px] text-[#5b6775]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading the gallery…
      </div>
    );
  }

  const live = photos.filter((p) => p.status === "published").length;
  const openPhoto = photos.find((p) => p.id === openId) ?? null;

  return (
    <div className="space-y-5">
      <FormSection
        title="Photos"
        description={`${photos.length} photos, ${live} on the website.`}
        actions={
          <>
            <label
              className={cn(
                "inline-flex h-[40px] cursor-pointer items-center gap-2 rounded-[6px] bg-[#0b1f3a] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#123056]",
                (progress || cropQueue.length > 0) && "pointer-events-none opacity-70"
              )}
            >
              {progress ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {progress ?? "Upload photos"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                disabled={Boolean(progress) || cropQueue.length > 0}
                onChange={(e) => {
                  queueUploads(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          </>
        }
      >
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Show photos from">
          {[{ value: "any", label: "All" }, ...GALLERY_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPlace(option.value)}
              className={cn(
                "h-8 rounded-full px-3 text-[13px] font-semibold",
                place === option.value ? "bg-[#0b1f3a] text-white" : "bg-[#f1f4f7] text-[#3d4c5f] hover:bg-[#e7edf3]"
              )}
              aria-pressed={place === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
        {openPhoto ? (
          <div id={`gallery-${openPhoto.id}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={siteAssetUrl(photoSrc(openPhoto))}
              alt=""
              className="mx-auto max-h-[420px] w-full bg-[#f6f8fa] object-contain"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Move this photo">
                {GALLERY_CATEGORIES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => patchPhoto(openPhoto.id, { category: option.value }, true)}
                    className={cn(
                      "h-8 rounded-full px-3 text-[13px] font-semibold",
                      (openPhoto.category || "all") === option.value ? "bg-[#0b1f3a] text-white" : "bg-[#f1f4f7] text-[#3d4c5f] hover:bg-[#e7edf3]"
                    )}
                    aria-pressed={(openPhoto.category || "all") === option.value}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={!canPublish}
                onClick={() =>
                  patchPhoto(
                    openPhoto.id,
                    { status: openPhoto.status === "published" ? "draft" : "published" },
                    true,
                    openPhoto.status === "published" ? "Photo hidden." : "Photo is now on the website."
                  )
                }
                className="h-8 rounded-full bg-[#f1f4f7] px-3 text-[13px] font-semibold text-[#0b1f3a] disabled:opacity-50"
              >
                {openPhoto.status === "published" ? "Hide" : "Show"}
              </button>
              {canDelete ? (
                <button
                  type="button"
                  onClick={() => removePhoto(openPhoto)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#98a3b1] hover:bg-[#fdecea] hover:text-[#b42318]"
                  aria-label="Remove photo"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setOpenId(null)}
                className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-full text-[#5b6775] hover:bg-[#f1f4f7]"
                aria-label="Close photo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
        {shown.length === 0 ? (
          <EmptyState>No photos here yet. Click Upload photos to add some.</EmptyState>
        ) : (
          <ul className="-mx-5 -mb-5 grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-[3px] bg-[#f6f8fa]">
            {shown.map((p) => (
              <li key={p.id} id={openPhoto?.id === p.id ? undefined : `gallery-${p.id}`}>
                <button
                  type="button"
                  onClick={() => setOpenId((current) => (current === p.id ? null : p.id))}
                  className={cn(
                    "relative block aspect-square w-full overflow-hidden bg-[#e7edf3]",
                    openId === p.id && "outline outline-2 outline-[#0b1f3a] outline-offset-[-2px]"
                  )}
                  aria-label={p.alt_text || p.title || "Photo"}
                  aria-pressed={openId === p.id}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={siteAssetUrl(photoSrc(p))}
                    alt=""
                    className={cn("h-full w-full object-cover", p.status !== "published" && "opacity-45")}
                    loading="lazy"
                    decoding="async"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </FormSection>

      <FormSection
        title="Videos"
        description="YouTube videos shown on the Gallery page. Drag a video to change the order. The featured video is also shown on the home page."
        actions={
          !video && (
            <Button onClick={() => startVideo()}>
              <Plus className="h-4 w-4" />
              Add video
            </Button>
          )
        }
      >
        {video && (
          <form onSubmit={saveVideo} className="space-y-4 rounded-[10px] border border-[#e3e8ee] bg-[#fafbfc] p-4">
            <Field label="YouTube link" hint="Open the video on YouTube, click Share, then Copy and paste the link here.">
              <Input
                value={video.link}
                onChange={(e) => setVideo({ ...video, link: e.target.value })}
                placeholder="https://youtu.be/…"
                autoFocus
              />
            </Field>
            {youtubeIdFrom(video.link) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`https://img.youtube.com/vi/${youtubeIdFrom(video.link)}/mqdefault.jpg`}
                alt=""
                className="h-[90px] w-[160px] rounded-[8px] object-cover"
              />
            )}
            <FieldGrid>
              <Field label="Title">
                <Input value={video.title} onChange={(e) => setVideo({ ...video, title: e.target.value })} />
              </Field>
              <Field label="Short description" optional>
                <Textarea
                  className="min-h-[42px]"
                  rows={2}
                  value={video.caption}
                  onChange={(e) => setVideo({ ...video, caption: e.target.value })}
                />
              </Field>
            </FieldGrid>
            <div className="flex flex-wrap gap-6">
              <Switch
                checked={video.featured}
                onChange={(featured) => setVideo({ ...video, featured })}
                label="Featured video"
                hint="Shown first. Only one video can be featured."
              />
              <Switch
                checked={video.status === "published"}
                disabled={!canPublish}
                onChange={(on) => setVideo({ ...video, status: on ? "published" : "draft" })}
                label={video.status === "published" ? "Shown on website" : "Hidden (draft)"}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={savingVideo}>
                {savingVideo ? "Saving…" : video.id ? "Save video" : "Add video"}
              </Button>
              <Button variant="secondary" onClick={() => setVideo(null)}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {videos.length === 0 && !video ? (
          <EmptyState>No videos yet. Click Add video and paste a YouTube link.</EmptyState>
        ) : (
          <ul className="divide-y divide-[#eef1f4]">
            {videos.map((v, index) => (
              <li
                id={`gallery-${v.id}`}
                key={v.id}
                ref={videoDrag.itemRef(index)}
                style={videos.length >= DRAG_FROM ? videoDrag.itemStyle(index) : undefined}
                className="flex flex-wrap items-center gap-4 bg-white py-3"
              >
                {videos.length >= DRAG_FROM && (
                  <span
                    onPointerDown={(event) => videoDrag.onGripPointerDown(index, event)}
                    className="inline-flex h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center text-[#98a3b1] active:cursor-grabbing"
                    aria-label="Drag to reorder"
                    title="Drag to reorder"
                  >
                    <GripVertical className="h-4 w-4" />
                  </span>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg`}
                  alt=""
                  className={cn("h-[68px] w-[120px] shrink-0 rounded-[8px] object-cover", v.status !== "published" && "opacity-50")}
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-[14px] font-semibold text-[#0b1f3a]">
                    {v.title || "Untitled video"}
                    {v.featured && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#c5a028]/15 px-2 py-0.5 text-[11.5px] font-semibold text-[#8a6d12]">
                        <Star className="h-3 w-3" /> Featured
                      </span>
                    )}
                  </p>
                  {v.caption && <p className="mt-0.5 line-clamp-2 text-[13px] text-[#6b7785]">{v.caption}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={v.status === "published"}
                    disabled={!canPublish}
                    onChange={(on) => toggleVideo(v, on ? "published" : "draft")}
                    label={<span className="text-[13px]">On website</span>}
                  />
                  <Button variant="secondary" size="sm" onClick={() => startVideo(v)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => removeVideo(v)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-[#98a3b1] hover:bg-[#fdecea] hover:text-[#b42318]"
                      aria-label="Remove video"
                      title="Remove video"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </FormSection>
      {cropQueue[0] && !progress && (
        <PhotoCropDialog
          file={cropQueue[0]}
          note={batch.current.total > 1 ? `Photo ${batch.current.total - cropQueue.length + 1} of ${batch.current.total}.` : undefined}
          onCancel={() => finishQueued(false)}
          onDone={(file) => {
            void acceptQueued(file);
          }}
        />
      )}
    </div>
  );
}
