"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFeedback } from "@/components/ui/feedback";
import { UserAvatar } from "@/components/portal/user-avatar";
import { withBusy } from "@/lib/upload-client";
import { GalleryBrowser } from "@/components/ui/image-field";
import { PhotoCropDialog } from "@/components/ui/photo-crop";

export function AvatarField({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(avatarUrl);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<File | null>(null);

  async function upload(file: File) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const data = await withBusy("Uploading your photo…", async () => {
        const res = await fetch("/api/account/avatar", { method: "POST", body: fd });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? "The upload did not work. Please try again.");
        return json;
      });
      setUrl(data.avatarUrl);
      toast("Your photo has been updated.");
      router.refresh();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    const ok = await confirm({ title: "Remove your photo?", message: "Your initials will be shown instead.", confirmLabel: "Remove", danger: true });
    if (!ok) return;
    setBusy(true);
    try {
      await withBusy("Removing your photo…", async () => {
        const res = await fetch("/api/account/avatar", { method: "DELETE" });
        if (!res.ok) throw new Error("Could not remove the photo. Please try again.");
      });
      setUrl(null);
      toast("Your photo has been removed.");
      router.refresh();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <UserAvatar name={name} url={url} size={64} />
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) setPending(file);
          }}
        />
        <Button variant="secondary" size="sm" disabled={busy} onClick={() => input.current?.click()}>
          <Camera className="h-4 w-4" /> {url ? "Change photo" : "Upload a photo"}
        </Button>
        <GalleryBrowser
          onPick={async (src) => {
            try {
              const res = await fetch(src);
              if (!res.ok) throw new Error("Could not use that gallery photo.");
              const blob = await res.blob();
              const type = blob.type || "image/jpeg";
              setPending(new File([blob], "gallery-photo", { type }));
            } catch (err) {
              toast((err as Error).message, "error");
            }
          }}
        />
        {url && (
          <Button variant="ghost" size="sm" disabled={busy} onClick={remove}>
            <Trash2 className="h-4 w-4" /> Remove
          </Button>
        )}
        <p className="w-full text-[12.5px] text-[#6b7785]">JPG, PNG or WebP, up to 3 MB. You can trim it to a square before it is saved.</p>
      </div>
      {pending && (
        <PhotoCropDialog
          file={pending}
          aspect={1}
          onCancel={() => setPending(null)}
          onDone={(file) => {
            setPending(null);
            void upload(file);
          }}
        />
      )}
    </div>
  );
}
