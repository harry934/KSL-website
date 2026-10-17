"use client";

import { useRef, useState } from "react";

/** Drag handles appear only once a list is long enough that order is hard to scan. */
export const DRAG_FROM = 6;

type Drag = { from: number; to: number; dy: number; stride: number };

/** Rows slide apart while a handle is dragged, then the new order is saved on release. */
export function useLiveDrag(onCommit: (from: number, to: number) => void) {
  const refs = useRef(new Map<number, HTMLElement>());
  const commit = useRef(onCommit);
  commit.current = onCommit;
  const dragRef = useRef<Drag | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);

  function publish(next: Drag | null) {
    dragRef.current = next;
    setDrag(next);
  }

  function offset(index: number) {
    const current = drag;
    if (!current) return 0;
    if (index === current.from) return current.dy;
    if (current.from < current.to && index > current.from && index <= current.to) return -current.stride;
    if (current.to < current.from && index >= current.to && index < current.from) return current.stride;
    return 0;
  }

  function itemRef(index: number) {
    return (node: HTMLElement | null) => {
      if (node) refs.current.set(index, node);
      else refs.current.delete(index);
    };
  }

  function itemStyle(index: number): React.CSSProperties {
    const y = offset(index);
    const active = drag?.from === index;
    return {
      transform: y ? `translate3d(0, ${y}px, 0)` : undefined,
      transition: active || !drag ? undefined : "transform 180ms cubic-bezier(0.2, 0, 0, 1)",
      zIndex: active ? 20 : undefined,
      position: "relative",
      boxShadow: active ? "0 16px 36px rgba(11, 31, 58, 0.18)" : undefined,
      background: active ? "#fff" : undefined,
    };
  }

  function onGripPointerDown(index: number, event: React.PointerEvent<HTMLElement>) {
    if (event.button !== 0) return;
    const row = refs.current.get(index);
    if (!row) return;
    event.preventDefault();
    event.stopPropagation();

    const startY = event.clientY;
    const slots = [...refs.current.entries()]
      .map(([i, el]) => {
        const box = el.getBoundingClientRect();
        return { i, top: box.top, height: box.height };
      })
      .sort((a, b) => a.i - b.i);
    const place = slots.findIndex((slot) => slot.i === index);
    const stride =
      place >= 0 && place < slots.length - 1
        ? slots[place + 1].top - slots[place].top
        : place > 0
          ? slots[place].top - slots[place - 1].top
          : row.getBoundingClientRect().height;
    const mids = slots.map((slot) => ({ i: slot.i, mid: slot.top + slot.height / 2 }));

    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const previousCursor = document.body.style.cursor;
    const previousSelect = document.body.style.userSelect;
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
    publish({ from: index, to: index, dy: 0, stride });

    function targetIndex(clientY: number) {
      let to = slots[0]?.i ?? index;
      for (const slot of mids) {
        if (clientY >= slot.mid) to = slot.i;
      }
      return to;
    }

    function move(pointer: PointerEvent) {
      const current = dragRef.current;
      if (!current) return;
      publish({ ...current, dy: pointer.clientY - startY, to: targetIndex(pointer.clientY) });
    }

    function end() {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", end);
      handle.removeEventListener("pointercancel", end);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousSelect;
      const current = dragRef.current;
      publish(null);
      if (current && current.from !== current.to) commit.current(current.from, current.to);
    }

    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
  }

  return { itemRef, itemStyle, onGripPointerDown, dragging: drag != null };
}
