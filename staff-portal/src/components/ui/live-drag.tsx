"use client";

import { useRef, useState } from "react";

/** Drag handles appear only once a list is long enough that order is hard to scan. */
export const DRAG_FROM = 6;

type Drag = { from: number; to: number; dy: number; stride: number };

/** Rows slide apart while a row is dragged, then the new order is saved on release. */
export function useLiveDrag(onCommit: (from: number, to: number) => void) {
  const refs = useRef(new Set<HTMLElement>());
  const commit = useRef(onCommit);
  commit.current = onCommit;
  const dragRef = useRef<Drag | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const moved = useRef(false);

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
      if (!node) return;
      node.dataset.dragIndex = String(index);
      refs.current.add(node);
    };
  }

  function itemStyle(index: number): React.CSSProperties {
    const y = offset(index);
    const active = drag?.from === index;
    return {
      transform: y ? `translate3d(0, ${y}px, 0)` : undefined,
      transition: active || !drag ? "none" : "transform 160ms cubic-bezier(0.2, 0.8, 0.2, 1)",
      willChange: drag ? "transform" : undefined,
      zIndex: active ? 20 : undefined,
      position: "relative",
      boxShadow: active ? "0 16px 36px rgba(11, 31, 58, 0.18)" : undefined,
      background: active ? "#fff" : undefined,
    };
  }

  function slotsNow() {
    const stale: HTMLElement[] = [];
    const byIndex = new Map<number, HTMLElement>();
    for (const el of refs.current) {
      if (!el.isConnected) {
        stale.push(el);
        continue;
      }
      const index = Number(el.dataset.dragIndex);
      if (Number.isInteger(index)) byIndex.set(index, el);
    }
    stale.forEach((el) => refs.current.delete(el));
    return [...byIndex.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([index, el]) => {
        const box = el.getBoundingClientRect();
        return { i: index, top: box.top, height: box.height };
      });
  }

  function onGripPointerDown(index: number, event: React.PointerEvent<HTMLElement>) {
    if (event.button !== 0) return;
    const slots = slotsNow();
    const row = slots.find((slot) => slot.i === index);
    if (!row) return;
    event.stopPropagation();

    const startY = event.clientY;
    const place = slots.findIndex((slot) => slot.i === index);
    const stride =
      place >= 0 && place < slots.length - 1
        ? slots[place + 1].top - slots[place].top
        : place > 0
          ? slots[place].top - slots[place - 1].top
          : row.height;
    const mids = slots.map((slot) => ({ i: slot.i, mid: slot.top + slot.height / 2 }));
    const previousCursor = document.body.style.cursor;
    const previousSelect = document.body.style.userSelect;
    moved.current = false;
    let frame = 0;
    let dragging = false;

    function targetIndex(clientY: number) {
      let to = slots[0]?.i ?? index;
      for (const slot of mids) {
        if (clientY >= slot.mid) to = slot.i;
      }
      return to;
    }

    function begin() {
      dragging = true;
      moved.current = true;
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
      publish({ from: index, to: index, dy: 0, stride });
    }

    function move(pointer: PointerEvent) {
      const dy = pointer.clientY - startY;
      if (!dragging) {
        if (Math.abs(dy) < 4) return;
        pointer.preventDefault();
        begin();
      }
      const current = dragRef.current;
      if (!current) return;
      dragRef.current = { ...current, dy, to: targetIndex(pointer.clientY) };
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const latest = dragRef.current;
        if (latest) setDrag({ ...latest });
      });
    }

    function end(pointer: PointerEvent) {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousSelect;
      if (!dragging) return;
      const current = dragRef.current;
      const to = targetIndex(pointer.clientY);
      publish(null);
      if (current && current.from !== to) commit.current(current.from, to);
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  }

  function eatClick(event: React.SyntheticEvent) {
    if (!moved.current) return;
    moved.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  return { itemRef, itemStyle, onGripPointerDown, dragging: drag != null, eatClick };
}
