"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eye, EyeOff, GripVertical, Loader2, Pencil, Plus, Star, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, Field, FieldGrid, FormSection, Switch, Textarea } from "@/components/ui/form-bits";
import { useFeedback } from "@/components/ui/feedback";
import { useCan } from "@/components/portal/session-context";
import { GALLERY_CATEGORIES, galleryPlace, photoSrc, youtubeIdFrom, type GalleryRow, type GalleryVideoRow } from "@/lib/gallery";
import { DRAG_FROM, useLiveDrag } from "@/components/ui/live-drag";
import { reorderItem } from "@/lib/list-utils";
import { siteAssetUrl } from "@/lib/site-url";
import { sendJson, uploadFile, awaitingReview, DRAFT_SAVED } from "@/lib/upload-client";
import { PhotoCropDialog } from "@/components/ui/photo-crop";
import { cn } from "@/lib/cn";

type VideoDraft = { id?: string; link: string; title: string; caption: string; featured: boolean; status: string; sort_order: number };
type PhotoEdit = { id: string; title: string; alt_text: string; category: string; status: string };
type PhotoView = "all" | "shown" | "hidden";

const EMPTY_VIDEO: VideoDraft = { link: "", title: "", caption: "", featured: false, status: "published", sort_order: 0 };

export function GalleryEditor() {
  const { toast, confirm } = useFeedback();
  const canPublish = useCan("gallery", "publish");
  const canDelete = useCan("gallery", "delete");

  const [photos, setPhotos] = useState<GalleryRow[]>([]);
  const [videos, setVideos] = useState<GalleryVideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [place, setPlace] = useState("any");
  const [photoView, setPhotoView] = useState<PhotoView>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [edit, setEdit] = useState<PhotoEdit | null>(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
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

  const shown = useMemo(
    () =>
      photos.filter((photo) => {
        if (place !== "any" && (photo.category || "all") !== place) return false;
        if (photoView === "shown" && photo.status !== "published") return false;
        if (photoView === "hidden" && photo.status === "published") return false;
        return true;
      }),
    [photos, place, photoView]
  );

  useEffect(() => {
    if (!openId) {
      setEdit(null);
      return;
    }
    const photo = photos.find((row) => row.id === openId);
    if (!photo) {
      setOpenId(null);
      setEdit(null);
      return;
    }
    setEdit((current) =>
      current?.id === photo.id
        ? current
        : {
            id: photo.id,
            title: photo.title ?? "",
            alt_text: photo.alt_text ?? "",
            category: photo.category || "all",
            status: photo.status,
          }
    );
  }, [openId, photos]);

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
    setEdit((current) => {
      if (current?.id !== id) return current;
      return {
        ...current,
        title: patch.title !== undefined ? (next.title ?? "") : current.title,
        alt_text: patch.alt_text !== undefined ? (next.alt_text ?? "") : current.alt_text,
        category: patch.category !== undefined ? next.category || "all" : current.category,
        status: patch.status !== undefined ? next.status : current.status,
      };
    });
    if (persist) savePhoto(next, message);
  }

  function showPhoto(row: GalleryRow, on: boolean) {
    if (!canPublish) return;
    patchPhoto(
      row.id,
      { status: on ? "published" : "draft" },
      true,
      on ? "Photo is now on the website." : "Photo hidden from the website."
    );
  }

  async function saveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!edit) return;
    const row = photos.find((photo) => photo.id === edit.id);
    if (!row) return;
    const next = {
      ...row,
      title: edit.title.trim(),
      alt_text: edit.alt_text.trim(),
      category: edit.category,
      status: canPublish ? edit.status : row.status,
    };
    setSavingPhoto(true);
    setPhotos((list) => list.map((photo) => (photo.id === row.id ? next : photo)));
    const hidden = next.status !== "published";
    await savePhoto(next, hidden ? "Photo hidden from the website." : "Photo saved.");
    setSavingPhoto(false);
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
        description={`${live} on the website, ${photos.length - live} hidden. Hidden photos leave the Gallery page.`}
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
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Which photos">
            {(
              [
                ["all", "All photos"],
                ["shown", "On the website"],
                ["hidden", "Hidden"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPhotoView(value)}
                className={cn(
                  "h-8 rounded-full px-3 text-[13px] font-semibold",
                  photoView === value ? "bg-[#0b1f3a] text-white" : "bg-[#f1f4f7] text-[#3d4c5f] hover:bg-[#e7edf3]"
                )}
                aria-pressed={photoView === value}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Show photos from">
            {[{ value: "any", label: "All places" }, ...GALLERY_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPlace(option.value)}
                className={cn(
                  "h-8 rounded-full px-3 text-[13px] font-semibold",
                  place === option.value ? "bg-[#123056] text-white" : "bg-white text-[#3d4c5f] ring-1 ring-[#e3e8ee] hover:bg-[#f6f8fa]"
                )}
                aria-pressed={place === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        {openPhoto && edit?.id === openPhoto.id ? (
          <form id={`gallery-${openPhoto.id}`} onSubmit={saveEdit} className="grid gap-4 rounded-[10px] border border-[#e3e8ee] bg-[#fafbfc] p-4 md:grid-cols-[220px_1fr]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={siteAssetUrl(photoSrc(openPhoto))}
              alt=""
              className={cn("aspect-[4/3] w-full rounded-[8px] bg-[#e7edf3] object-cover", edit.status !== "published" && "opacity-60")}
            />
            <div className="min-w-0 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13px] font-semibold text-[#5b6775]">
                  {edit.status === "published" ? "On the website" : "Hidden from the website"}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setOpenId(null);
                    setEdit(null);
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#5b6775] hover:bg-[#f1f4f7]"
                  aria-label="Close photo"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <FieldGrid>
                <Field label="Title" optional>
                  <Input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="Name shown under the photo" />
                </Field>
                <Field label="Description" optional>
                  <Textarea
                    className="min-h-[42px]"
                    rows={2}
                    value={edit.alt_text}
                    onChange={(e) => setEdit({ ...edit, alt_text: e.target.value })}
                    placeholder="What the photo shows"
                  />
                </Field>
              </FieldGrid>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Place">
                {GALLERY_CATEGORIES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setEdit({ ...edit, category: option.value })}
                    className={cn(
                      "h-8 rounded-full px-3 text-[13px] font-semibold",
                      edit.category === option.value ? "bg-[#0b1f3a] text-white" : "bg-white text-[#3d4c5f] ring-1 ring-[#e3e8ee] hover:bg-[#f6f8fa]"
                    )}
                    aria-pressed={edit.category === option.value}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <Switch
                checked={edit.status === "published"}
                disabled={!canPublish}
                onChange={(on) => setEdit({ ...edit, status: on ? "published" : "draft" })}
                label={edit.status === "published" ? "Shown on the website" : "Hidden"}
                hint="Hidden photos stay in this list and leave the public Gallery page."
              />
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={savingPhoto}>
                  {savingPhoto ? "Saving…" : "Save photo"}
                </Button>
                {canDelete ? (
                  <Button type="button" variant="secondary" onClick={() => removePhoto(openPhoto)}>
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
          </form>
        ) : null}
        {shown.length === 0 ? (
          <EmptyState>
            {photos.length === 0 ? "No photos here yet. Click Upload photos to add some." : "No photos in this view."}
          </EmptyState>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
            {shown.map((p) => {
              const hidden = p.status !== "published";
              const selected = openId === p.id;
              return (
                <li key={p.id} id={selected ? undefined : `gallery-${p.id}`} className={cn("overflow-hidden rounded-[10px] border bg-white", selected ? "border-[#0b1f3a]" : "border-[#e3e8ee]")}>
                  <button
                    type="button"
                    onClick={() => {
                      if (selected) {
                        setOpenId(null);
                        setEdit(null);
                        return;
                      }
                      setOpenId(p.id);
                      setEdit({
                        id: p.id,
                        title: p.title ?? "",
                        alt_text: p.alt_text ?? "",
                        category: p.category || "all",
                        status: p.status,
                      });
                    }}
                    className="relative block aspect-[4/3] w-full overflow-hidden bg-[#e7edf3]"
                    aria-label={p.alt_text || p.title || "Photo"}
                    aria-pressed={selected}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={siteAssetUrl(photoSrc(p))}
                      alt=""
                      className={cn("h-full w-full object-cover", hidden && "opacity-45")}
                      loading="lazy"
                      decoding="async"
                    />
                    {hidden ? (
                      <span className="absolute left-2 top-2 rounded-full bg-white px-2 py-0.5 text-[11.5px] font-semibold text-[#0b1f3a]">Hidden</span>
                    ) : null}
                  </button>
                  <div className="space-y-2 p-3">
                    <p className="truncate text-[13.5px] font-semibold text-[#0b1f3a]">{p.title || "Untitled photo"}</p>
                    <p className="text-[12px] text-[#6b7785]">{galleryPlace(p.category).label}</p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setOpenId(p.id);
                          setEdit({
                            id: p.id,
                            title: p.title ?? "",
                            alt_text: p.alt_text ?? "",
                            category: p.category || "all",
                            status: p.status,
                          });
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button type="button" variant="secondary" size="sm" className="flex-1" disabled={!canPublish} onClick={() => showPhoto(p, hidden)}>
                        {hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        {hidden ? "Show" : "Hide"}
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
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
