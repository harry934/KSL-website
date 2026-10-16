"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Pencil, Plus, Star, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, Field, FieldGrid, FormSection, GridOrder, MoveButtons, Select, Switch, Textarea } from "@/components/ui/form-bits";
import { useFeedback } from "@/components/ui/feedback";
import { useCan } from "@/components/portal/session-context";
import { GALLERY_CATEGORIES, photoSrc, youtubeIdFrom, type GalleryRow, type GalleryVideoRow } from "@/lib/gallery";
import { moveItem } from "@/lib/list-utils";
import { siteAssetUrl } from "@/lib/site-url";
import { sendJson, uploadFile } from "@/lib/upload-client";
import { cn } from "@/lib/cn";

type VideoDraft = { id?: string; link: string; title: string; caption: string; featured: boolean; status: string; sort_order: number };

const EMPTY_VIDEO: VideoDraft = { link: "", title: "", caption: "", featured: false, status: "published", sort_order: 0 };

function captionFromFile(name: string) {
  const base = name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export function GalleryEditor() {
  const { toast, confirm } = useFeedback();
  const canPublish = useCan("gallery", "publish");
  const canDelete = useCan("gallery", "delete");

  const [photos, setPhotos] = useState<GalleryRow[]>([]);
  const [videos, setVideos] = useState<GalleryVideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [place, setPlace] = useState("any");
  const [columns, setColumns] = useState(1);
  const photoGrid = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState<string | null>(null);
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

  const shown = useMemo(() => (place === "any" ? photos : photos.filter((p) => (p.category || "all") === place)), [photos, place]);

  useEffect(() => {
    const el = photoGrid.current;
    if (!el) return;
    const measure = () => {
      const count = getComputedStyle(el).gridTemplateColumns.split(" ").filter(Boolean).length;
      setColumns(Math.max(1, count));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [shown.length, loading, place]);

  async function savePhoto(row: GalleryRow, message?: string) {
    try {
      await sendJson("/api/gallery", "POST", row);
      if (message) toast(message);
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

  async function onUpload(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files);
    let order = photos.reduce((max, p) => Math.max(max, p.sort_order), 0);
    let added = 0;
    for (const [i, file] of list.entries()) {
      setProgress(list.length > 1 ? `Uploading ${i + 1} of ${list.length}…` : "Uploading…");
      try {
        const up = await uploadFile("gallery", file);
        order += 1;
        await sendJson("/api/gallery", "POST", {
          title: captionFromFile(file.name),
          category: place === "any" ? "all" : place,
          public_url: up.public_url,
          storage_path: up.storage_path,
          sort_order: order,
          status: canPublish ? "published" : "draft",
        });
        added += 1;
      } catch (e) {
        toast(`${file.name}: ${(e as Error).message}`, "error");
      }
    }
    setProgress(null);
    if (added) toast(added === 1 ? "Photo added." : `${added} photos added.`);
    load();
  }

  async function movePhoto(index: number, delta: number) {
    const next = moveItem(photos, index, delta).map((p, i) => ({ ...p, sort_order: i }));
    const before = new Map(photos.map((p) => [p.id, p.sort_order]));
    const changed = next.filter((p) => before.get(p.id) !== p.sort_order);
    setPhotos(next);
    try {
      await Promise.all(changed.map((p) => sendJson("/api/gallery", "POST", p)));
    } catch (e) {
      toast((e as Error).message, "error");
      load();
    }
  }

  async function removePhoto(row: GalleryRow) {
    const ok = await confirm({
      title: "Remove this photo?",
      message: "It will disappear from the website's Gallery page.",
      confirmLabel: "Remove photo",
      danger: true,
    });
    if (!ok) return;
    try {
      await sendJson(`/api/gallery?id=${encodeURIComponent(row.id)}`, "DELETE");
      setPhotos((list) => list.filter((p) => p.id !== row.id));
      toast("Photo removed.");
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
      await sendJson("/api/gallery", "POST", {
        type: "video",
        id: video.id,
        youtube_id: youtubeId,
        title: video.title,
        caption: video.caption,
        featured: video.featured,
        status: video.status,
        sort_order: video.sort_order,
      });
      toast(video.id ? "Video saved." : "Video added.");
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

  async function moveVideo(index: number, delta: number) {
    const next = moveItem(videos, index, delta).map((v, i) => ({ ...v, sort_order: i }));
    setVideos(next);
    try {
      await Promise.all(next.map((v) => saveVideoRow(v)));
    } catch (e) {
      toast((e as Error).message, "error");
      load();
    }
  }

  async function removeVideo(row: GalleryVideoRow) {
    const ok = await confirm({
      title: "Remove this video?",
      message: `"${row.title}" will no longer show on the website. The video stays on YouTube.`,
      confirmLabel: "Remove video",
      danger: true,
    });
    if (!ok) return;
    try {
      await sendJson(`/api/gallery?id=${encodeURIComponent(row.id)}&type=video`, "DELETE");
      setVideos((list) => list.filter((v) => v.id !== row.id));
      toast("Video removed.");
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

  return (
    <div className="space-y-5">
      <FormSection
        title="Photos"
        description={
          place === "any"
            ? `${photos.length} photos, ${live} shown on the website. Up and down move a photo to another row. Left and right move it along the row. Photo 1 is shown first.`
            : `${photos.length} photos, ${live} shown on the website. Choose All places to change the order.`
        }
        actions={
          <>
            <div className="w-[190px]">
              <Select value={place} onChange={(e) => setPlace(e.target.value)} aria-label="Show photos from">
                <option value="any">All places</option>
                {GALLERY_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
            <label
              className={cn(
                "inline-flex h-[40px] cursor-pointer items-center gap-2 rounded-[6px] bg-[#0b1f3a] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#123056]",
                progress && "pointer-events-none opacity-70"
              )}
            >
              {progress ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {progress ?? "Upload photos"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                disabled={!!progress}
                onChange={(e) => {
                  const files = e.target.files;
                  onUpload(files).finally(() => (e.target.value = ""));
                }}
              />
            </label>
          </>
        }
      >
        {shown.length === 0 ? (
          <EmptyState>No photos here yet. Click Upload photos to add some.</EmptyState>
        ) : (
          <div ref={photoGrid} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {shown.map((p) => {
              const index = photos.findIndex((x) => x.id === p.id);
              return (
                <div key={p.id} className="overflow-hidden rounded-[10px] border border-[#e3e8ee] bg-white">
                  <div className="relative aspect-[4/3] bg-[#f1f4f7]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={siteAssetUrl(photoSrc(p))}
                      alt={p.title ?? ""}
                      className={cn("h-full w-full object-cover", p.status !== "published" && "opacity-50")}
                      loading="lazy"
                      decoding="async"
                    />
                    {p.status !== "published" && (
                      <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[12px] font-semibold text-[#5b6775]">
                        Hidden
                      </span>
                    )}
                  </div>
                  <div className="space-y-3 p-3">
                    <Input
                      value={p.title ?? ""}
                      placeholder="Write a caption"
                      onChange={(e) => patchPhoto(p.id, { title: e.target.value }, false)}
                      onBlur={(e) => savePhoto({ ...p, title: e.target.value }, "Caption saved.")}
                      aria-label="Caption"
                    />
                    <Select
                      value={p.category || "all"}
                      onChange={(e) => patchPhoto(p.id, { category: e.target.value }, true, "Place saved.")}
                      aria-label="Place"
                    >
                      {GALLERY_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </Select>
                    <div className="flex items-center justify-between gap-2">
                      <Switch
                        checked={p.status === "published"}
                        disabled={!canPublish}
                        onChange={(on) =>
                          patchPhoto(p.id, { status: on ? "published" : "draft" }, true, on ? "Photo is now on the website." : "Photo hidden.")
                        }
                        label={<span className="text-[13px]">On website</span>}
                      />
                      <span className="flex items-center">
                        {place === "any" && (
                          <GridOrder index={index} count={photos.length} columns={columns} onMove={movePhoto} />
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => removePhoto(p)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-[#98a3b1] hover:bg-[#fdecea] hover:text-[#b42318]"
                            aria-label="Remove photo"
                            title="Remove photo"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </FormSection>

      <FormSection
        title="Videos"
        description="YouTube videos shown on the Gallery page. Higher in the list is shown first. The featured video is also shown on the home page."
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
              <li key={v.id} className="flex flex-wrap items-center gap-4 py-3">
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
                  <MoveButtons
                    onUp={() => moveVideo(index, -1)}
                    onDown={() => moveVideo(index, 1)}
                    first={index === 0}
                    last={index === videos.length - 1}
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
    </div>
  );
}
