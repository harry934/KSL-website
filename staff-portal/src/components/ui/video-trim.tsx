"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { HeroTrim } from "@/lib/hero-frame";

function clock(seconds: number) {
  const whole = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(whole / 60);
  return `${minutes}:${String(whole % 60).padStart(2, "0")}`;
}

/** Lets staff keep a start and end on a home-hero film. The file itself stays whole. */
export function VideoTrimDialog({
  url,
  initial,
  onCancel,
  onDone,
}: {
  url: string;
  initial: HeroTrim | null;
  onCancel: () => void;
  onDone: (trim: HeroTrim | null) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<"start" | "end" | null>(null);
  const range = useRef({ start: initial?.start ?? 0, end: initial?.end ?? 0, duration: 0 });
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(initial?.start ?? 0);
  const [end, setEnd] = useState(initial?.end ?? 0);
  const [ready, setReady] = useState(false);
  range.current = { start, end, duration };

  useEffect(() => {
    function point(clientX: number) {
      const track = trackRef.current;
      const length = range.current.duration;
      if (!track || length <= 0) return 0;
      const rect = track.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      return ratio * length;
    }
    function move(event: PointerEvent) {
      if (!drag.current) return;
      const time = point(event.clientX);
      const live = range.current;
      if (drag.current === "start") {
        const next = Math.max(0, Math.min(time, live.end - 0.5));
        setStart(next);
        const clip = videoRef.current;
        if (clip && clip.currentTime < next) clip.currentTime = next;
        return;
      }
      setEnd(Math.min(live.duration, Math.max(time, live.start + 0.5)));
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

  const span = Math.max(0, end - start);
  const left = duration > 0 ? (start / duration) * 100 : 0;
  const width = duration > 0 ? (span / duration) * 100 : 100;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(11,31,58,0.45)] p-4" onClick={() => window.setTimeout(onCancel, 0)}>
      <div className="flex max-h-[92vh] w-full max-w-[720px] flex-col bg-white" onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-[#eef1f4] px-4 py-3">
          <p className="m-0 text-[15px] font-semibold text-[#0b1f3a]">Trim the video</p>
          <p className="m-0 mt-1 text-[13px] text-[#6b7785]">
            Drag the ends of the bar to choose where the film starts and finishes. The homepage plays that part all the way through, then moves to the next slide.
          </p>
        </div>
        <div className="space-y-4 overflow-auto p-4">
          <video
            ref={videoRef}
            src={url}
            muted
            playsInline
            controls
            className="block max-h-[360px] w-full bg-[#0b1f3a]"
            onLoadedMetadata={(event) => {
              const clip = event.currentTarget;
              const length = Number.isFinite(clip.duration) ? clip.duration : 0;
              setDuration(length);
              const nextStart = Math.min(initial?.start ?? 0, Math.max(0, length - 0.5));
              const nextEnd = initial ? Math.min(initial.end, length) : length;
              setStart(nextStart);
              setEnd(Math.max(nextStart + 0.5, nextEnd));
              setReady(length > 0.5);
              clip.currentTime = nextStart;
            }}
            onTimeUpdate={(event) => {
              const clip = event.currentTarget;
              if (end > start && clip.currentTime >= end - 0.05) clip.currentTime = start;
            }}
          />
          <div
            ref={trackRef}
            className="relative h-10 bg-[#e7edf3]"
          >
            <div className="absolute inset-y-2 bg-[#0b1f3a]" style={{ left: `${left}%`, width: `${width}%` }} />
            <button
              type="button"
              aria-label="Trim start"
              className="absolute top-0 h-10 w-3 -translate-x-1/2 cursor-ew-resize bg-white shadow"
              style={{ left: `${left}%` }}
              onPointerDown={(event) => {
                event.preventDefault();
                drag.current = "start";
              }}
            />
            <button
              type="button"
              aria-label="Trim end"
              className="absolute top-0 h-10 w-3 -translate-x-1/2 cursor-ew-resize bg-white shadow"
              style={{ left: `${left + width}%` }}
              onPointerDown={(event) => {
                event.preventDefault();
                drag.current = "end";
              }}
            />
          </div>
          <p className="m-0 text-[13px] text-[#0b1f3a]">
            {ready ? `${clock(start)} to ${clock(end)} · ${clock(span)} on the homepage` : "Loading the film…"}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-[#eef1f4] px-4 py-3">
          <Button type="button" variant="secondary" onClick={() => window.setTimeout(onCancel, 0)}>
            Cancel
          </Button>
          <Button type="button" variant="secondary" onClick={() => onDone(null)} disabled={!ready}>
            Use the whole video
          </Button>
          <Button
            type="button"
            disabled={!ready}
            onClick={() => onDone(start < 0.2 && duration - end < 0.3 ? null : { start, end })}
          >
            Use this part
          </Button>
        </div>
      </div>
    </div>
  );
}
