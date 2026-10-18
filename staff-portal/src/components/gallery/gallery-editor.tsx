"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GripVertical, Loader2, Pencil, Plus, Star, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, Field, FieldGrid, FormSection, Select, Switch, Textarea } from "@/components/ui/form-bits";
import { useFeedback } from "@/components/ui/feedback";
import { useCan } from "@/components/portal/session-context";
import { GALLERY_CATEGORIES, photoSrc, youtubeIdFrom, type GalleryRow, type GalleryVideoRow } from "@/lib/gallery";
import { DRAG_FROM, useLiveDrag } from "@/components/ui/live-drag";
import { reorderItem } from "@/lib/list-utils";
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

  async function removePhoto(row: GalleryRow) {
    const ok = await confirm({
      title: "Remove this photo?",
      message: "It will leave the Gallery page. You can bring it back for a few seconds.",
      confirmLabel: "Remove photo",
      danger: true,
    });
    if (!ok) return;
    try {
      await sendJson(`/api/gallery?id=${encodeURIComponent(row.id)}`, "DELETE");
      setPhotos((list) => list.filter((p) => p.id !== row.id));
      toast("Photo removed.", "success", {
        label: "Bring it back",
        onClick: () => {
          sendJson("/api/gallery", "POST", row)
            .then(() => {
              toast("Photo brought back.");
              load();
            })
            .catch((err) => toast((err as Error).message, "error"));
        },
      });
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
      message: `"${row.title}" will no longer show on the website. The video stays on YouTube.`,
      confirmLabel: "Remove video",
      danger: true,
    });
    if (!ok) return;
    try {
      await sendJson(`/api/gallery?id=${encodeURIComponent(row.id)}&type=video`, "DELETE");
      toast("Video removed.", "success", {
        label: "Bring it back",
        onClick: () => {
          sendJson("/api/gallery", "POST", { ...row, type: "video", youtube_id: row.youtube_id })
            .then(() => {
              toast("Video brought back.");
              load();
            })
            .catch((err) => toast((err as Error).message, "error"));
        },
      });
      setVideos((list) => list.filter((v) => v.id !== row.id));
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
        description={`${photos.length} photos, ${live} on the Gallery page. The name is the caption under the picture. The place is the button a visitor clicks to find it.`}
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
          <div className="space-y-6">
            {[
              ...GALLERY_CATEGORIES.filter((placeOption) => shown.some((p) => (p.category || "all") === placeOption.value)),
              ...[...new Set(shown.map((p) => p.category || "all"))]
                .filter((value) => !GALLERY_CATEGORIES.some((c) => c.value === value))
                .map((value) => ({ value, label: value, where: "This place is not one of the buttons on the Gallery page, so the photo only appears in All." })),
            ].map((placeOption) => (
              <section key={placeOption.value}>
                <div className="mb-2">
                  <h3 className="text-[14px] font-bold text-[#0b1f3a]">{placeOption.label}</h3>
                  <p className="text-[12.5px] text-[#6b7785]">{placeOption.where}</p>
                </div>
                <ul className="divide-y divide-[#eef1f4] overflow-hidden rounded-[10px] border border-[#e3e8ee]">
                  {shown
                    .filter((p) => (p.category || "all") === placeOption.value)
                    .map((p) => (
                      <li key={p.id} className="flex flex-wrap items-center gap-3 bg-white px-3 py-2.5 sm:flex-nowrap">
                        <span className="relative h-14 w-20 shrink-0 overflow-hidden rounded-[6px] bg-[#f1f4f7]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={siteAssetUrl(photoSrc(p))}
                            alt=""
                            className={cn("h-full w-full object-cover", p.status !== "published" && "opacity-45")}
                            loading="lazy"
                            decoding="async"
                          />
                        </span>
                        <label className="min-w-[180px] flex-1">
                          <span className="mb-1 block text-[12px] font-semibold text-[#5b6775]">Name under the photo</span>
                          <Input
                            value={p.title ?? ""}
                            placeholder="e.g. MV Uhuru at Kisumu"
                            onChange={(e) => patchPhoto(p.id, { title: e.target.value }, false)}
                            onBlur={(e) => savePhoto({ ...p, title: e.target.value }, "Name saved.")}
                            aria-label="Name under the photo"
                          />
                        </label>
                        <label className="w-full sm:w-[210px]">
                          <span className="mb-1 block text-[12px] font-semibold text-[#5b6775]">Where it appears</span>
                          <Select
                            value={p.category || "all"}
                            onChange={(e) => patchPhoto(p.id, { category: e.target.value }, true, "Place saved.")}
                            aria-label="Where it appears"
                          >
                            {GALLERY_CATEGORIES.map((c) => (
                              <option key={c.value} value={c.value}>
                                {c.label}
                              </option>
                            ))}
                          </Select>
                        </label>
                        <div className="flex items-center gap-1">
                          <Switch
                            checked={p.status === "published"}
                            disabled={!canPublish}
                            onChange={(on) =>
                              patchPhoto(p.id, { status: on ? "published" : "draft" }, true, on ? "Photo is now on the website." : "Photo hidden.")
                            }
                            label={<span className="text-[13px]">{p.status === "published" ? "On the page" : "Hidden"}</span>}
                          />
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => removePhoto(p)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-[#98a3b1] hover:bg-[#fdecea] hover:text-[#b42318]"
                              aria-label="Remove photo"
                              title="Remove photo"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                </ul>
              </section>
            ))}
          </div>
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
    </div>
  );
}
