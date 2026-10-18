"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Box = { x: number; y: number; w: number; h: number };
const LARGE_BYTES = 1.5 * 1024 * 1024;

function sizeLabel(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Lets staff trim a photo before it is uploaded, and warns when the file is heavy. */
export function PhotoCropDialog({
  file,
  onCancel,
  onDone,
}: {
  file: File;
  onCancel: () => void;
  onDone: (file: File) => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ kind: "move" | "resize"; x: number; y: number; box: Box } | null>(null);
  const [url, setUrl] = useState("");
  const [box, setBox] = useState<Box>({ x: 0.08, y: 0.08, w: 0.84, h: 0.84 });
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);

  useEffect(() => {
    function move(event: PointerEvent) {
      const current = drag.current;
      const el = frame.current;
      if (!current || !el) return;
      const rect = el.getBoundingClientRect();
      const dx = (event.clientX - current.x) / rect.width;
      const dy = (event.clientY - current.y) / rect.height;
      if (current.kind === "move") {
        setBox({
          ...current.box,
          x: Math.min(1 - current.box.w, Math.max(0, current.box.x + dx)),
          y: Math.min(1 - current.box.h, Math.max(0, current.box.y + dy)),
        });
        return;
      }
      setBox({
        ...current.box,
        w: Math.min(1 - current.box.x, Math.max(0.12, current.box.w + dx)),
        h: Math.min(1 - current.box.y, Math.max(0.12, current.box.h + dy)),
      });
    }
    function up() {
      drag.current = null;
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  const heavy = file.size > LARGE_BYTES || natural.w > 2400 || natural.h > 2400;

  async function finish(full: boolean) {
    const image = imageRef.current;
    if (!image) return;
    setBusy(true);
    const sourceW = full ? image.naturalWidth : Math.max(1, Math.round(box.w * image.naturalWidth));
    const sourceH = full ? image.naturalHeight : Math.max(1, Math.round(box.h * image.naturalHeight));
    const scale = Math.min(1, 2200 / Math.max(sourceW, sourceH));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sourceW * scale));
    canvas.height = Math.max(1, Math.round(sourceH * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setBusy(false);
      return;
    }
    ctx.drawImage(
      image,
      full ? 0 : box.x * image.naturalWidth,
      full ? 0 : box.y * image.naturalHeight,
      sourceW,
      sourceH,
      0,
      0,
      canvas.width,
      canvas.height
    );
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
    setBusy(false);
    if (!blob) return;
    const name = file.name.replace(/\.[a-z0-9]+$/i, "") || "photo";
    onDone(new File([blob], `${name}.jpg`, { type: "image/jpeg" }));
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(11,31,58,0.45)] p-4">
      <div className="flex max-h-[92vh] w-full max-w-[640px] flex-col bg-white">
        <div className="border-b border-[#eef1f4] px-4 py-3">
          <p className="m-0 text-[15px] font-semibold text-[#0b1f3a]">Trim the photo</p>
          <p className="m-0 mt-1 text-[13px] text-[#6b7785]">Drag the frame to choose what visitors see. Drag the corner to change its size.</p>
        </div>
        <div className="overflow-auto p-4">
          {heavy && (
            <p className="mb-3 text-[13px] text-[#8a5a00]">
              This photo is {sizeLabel(file.size)}
              {natural.w ? ` and ${natural.w} by ${natural.h} pixels` : ""}. A smaller crop helps the website load faster.
            </p>
          )}
          <div ref={frame} className="relative inline-block max-w-full select-none bg-[#0b1f3a]">
            {url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={imageRef}
                src={url}
                alt=""
                className="block max-h-[420px] max-w-full"
                draggable={false}
                onLoad={(event) => setNatural({ w: event.currentTarget.naturalWidth, h: event.currentTarget.naturalHeight })}
              />
            )}
            <div
              className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(11,31,58,0.45)]"
              style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, height: `${box.h * 100}%` }}
              onPointerDown={(event) => {
                event.preventDefault();
                drag.current = { kind: "move", x: event.clientX, y: event.clientY, box };
              }}
            >
              <span
                className="absolute -bottom-1.5 -right-1.5 h-4 w-4 cursor-se-resize bg-white"
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  drag.current = { kind: "resize", x: event.clientX, y: event.clientY, box };
                }}
              />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-[#eef1f4] px-4 py-3">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" variant="secondary" onClick={() => finish(true)} disabled={busy}>
            Use the whole photo
          </Button>
          <Button type="button" onClick={() => finish(false)} disabled={busy}>
            {busy ? "Preparing…" : "Use this crop"}
          </Button>
        </div>
      </div>
    </div>
  );
}
