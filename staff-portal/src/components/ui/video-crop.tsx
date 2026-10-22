"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { HeroCrop } from "@/lib/hero-frame";

type Box = { x: number; y: number; w: number; h: number };

function wideFrame(videoW: number, videoH: number): Box {
  const aspect = 16 / 9;
  let w = 0.92;
  let h = (w * videoW) / (aspect * videoH);
  if (h > 0.92) {
    h = 0.92;
    w = (aspect * h * videoH) / videoW;
  }
  return { x: (1 - w) / 2, y: (1 - h) / 2, w, h };
}

function locked(origin: { x: number; y: number }, widthFrac: number, videoW: number, videoH: number): Box {
  const aspect = 16 / 9;
  const maxW = Math.max(0.16, 1 - origin.x);
  const maxH = Math.max(0.16, 1 - origin.y);
  let w = Math.min(maxW, Math.max(0.16, widthFrac));
  let h = (w * videoW) / (aspect * videoH);
  if (h > maxH) {
    h = maxH;
    w = Math.min(maxW, (aspect * h * videoH) / videoW);
    h = (w * videoW) / (aspect * videoH);
  }
  return {
    x: Math.min(origin.x, 1 - w),
    y: Math.min(origin.y, 1 - h),
    w,
    h,
  };
}

/** Lets staff choose the part of a home-hero film that fills the homepage. */
export function VideoCropDialog({
  url,
  initial,
  onCancel,
  onDone,
}: {
  url: string;
  initial: HeroCrop | null;
  onCancel: () => void;
  onDone: (crop: HeroCrop | null) => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ kind: "move" | "resize"; x: number; y: number; box: Box } | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const [box, setBox] = useState<Box>(initial ?? { x: 0.08, y: 0.08, w: 0.84, h: 0.84 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function move(event: PointerEvent) {
      const current = drag.current;
      const el = frame.current;
      const size = sizeRef.current;
      if (!current || !el || size.w < 1 || size.h < 1) return;
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
      setBox(locked({ x: current.box.x, y: current.box.y }, current.box.w + dx, size.w, size.h));
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

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(11,31,58,0.45)] p-4">
      <div className="flex max-h-[92vh] w-full max-w-[720px] flex-col bg-white">
        <div className="border-b border-[#eef1f4] px-4 py-3">
          <p className="m-0 text-[15px] font-semibold text-[#0b1f3a]">Crop the video</p>
          <p className="m-0 mt-1 text-[13px] text-[#6b7785]">
            Drag the frame to choose what the homepage shows. Drag the corner to zoom in. The frame stays wide, and phones keep the middle of it.
          </p>
        </div>
        <div className="overflow-auto p-4">
          <div ref={frame} className="relative inline-block max-w-full select-none bg-[#0b1f3a]">
            <video
              src={url}
              muted
              autoPlay
              loop
              playsInline
              className="pointer-events-none block max-h-[420px] max-w-full"
              onLoadedMetadata={(event) => {
                const w = event.currentTarget.videoWidth;
                const h = event.currentTarget.videoHeight;
                sizeRef.current = { w, h };
                setReady(w > 0 && h > 0);
                if (!initial && w > 0 && h > 0) setBox(wideFrame(w, h));
              }}
            />
            <div
              className="absolute cursor-move border-2 border-white shadow-[0_0_0_9999px_rgba(11,31,58,0.45)]"
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
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" variant="secondary" onClick={() => onDone(null)}>
            Use the whole video
          </Button>
          <Button type="button" onClick={() => onDone(box)} disabled={!ready}>
            Use this crop
          </Button>
        </div>
      </div>
    </div>
  );
}
