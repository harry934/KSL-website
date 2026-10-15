"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, Upload } from "lucide-react";
import type { GalleryRow } from "@/lib/gallery";

export function GalleryEditor() {
  const [photos, setPhotos] = useState<GalleryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/gallery");
    const data = await res.json();
    if (res.ok) setPhotos(data.photos ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const up = await fetch("/api/upload", { method: "POST", headers: { "x-ksl-module": "gallery" }, body: fd });
    const upData = await up.json();
    if (!up.ok) {
      setUploading(false);
      return;
    }
    await fetch("/api/gallery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: crypto.randomUUID(),
        title: file.name.replace(/\.[^.]+$/, ""),
        category: "all",
        public_url: upData.public_url,
        storage_path: upData.storage_path,
        sort_order: photos.length,
        status: "published",
      }),
    });
    setUploading(false);
    load();
    e.target.value = "";
  }

  async function updateTitle(id: string, title: string) {
    const row = photos.find((p) => p.id === id);
    if (!row) return;
    await fetch("/api/gallery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...row, title }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Remove this photo from the gallery?")) return;
    await fetch("/api/gallery?id=" + encodeURIComponent(id), { method: "DELETE" });
    load();
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[#5c6578]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading gallery…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-[#DDE5F0] bg-white px-4 py-2.5 text-sm font-semibold text-[#09296C] hover:border-[#0165FC]/40">
        <Upload className="h-4 w-4 text-[#0165FC]" />
        {uploading ? "Uploading…" : "Upload image"}
        <input type="file" accept="image/*" className="hidden" onChange={onUpload} disabled={uploading} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map((p) => (
          <div key={p.id} className="ksl-card overflow-hidden">
            {p.public_url && (
              <img src={p.public_url} alt="" className="h-40 w-full object-cover" />
            )}
            <div className="space-y-2 p-3">
              <Input
                value={p.title ?? ""}
                onBlur={(e) => updateTitle(p.id, e.target.value)}
                onChange={(e) =>
                  setPhotos((list) => list.map((x) => (x.id === p.id ? { ...x, title: e.target.value } : x)))
                }
              />
              <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => remove(p.id)}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
