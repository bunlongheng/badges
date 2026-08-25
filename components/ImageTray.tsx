"use client";

import { useRef, useState, type PointerEvent } from "react";
import type { BadgeImage } from "@/lib/useImages";

export function ImageTray({
  images,
  onRemove,
  onMove,
  onClear,
}: {
  images: BadgeImage[];
  onRemove: (id: string) => void;
  onMove: (from: number, to: number) => void;
  onClear: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const drag = useRef<{ idx: number; x: number; y: number; active: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClick = useRef(false);

  if (images.length === 0) return null;

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const handleDown = (e: PointerEvent<HTMLLIElement>, i: number) => {
    drag.current = { idx: i, x: e.clientX, y: e.clientY, active: false };
    const el = e.currentTarget;
    const pid = e.pointerId;
    // Touch/pen: long-press to start a reorder so a normal swipe still scrolls.
    if (e.pointerType !== "mouse") {
      timer.current = setTimeout(() => {
        if (drag.current) {
          drag.current.active = true;
          setDragIdx(drag.current.idx);
          el.setPointerCapture(pid);
        }
      }, 240);
    }
  };

  const handleMove = (e: PointerEvent<HTMLLIElement>) => {
    const d = drag.current;
    if (!d) return;
    const moved = Math.hypot(e.clientX - d.x, e.clientY - d.y);
    if (!d.active) {
      if (e.pointerType === "mouse") {
        if (moved > 6) {
          d.active = true;
          setDragIdx(d.idx);
          e.currentTarget.setPointerCapture(e.pointerId);
        }
      } else if (moved > 10) {
        clearTimer(); // moved before the long-press fired -> it is a scroll
        drag.current = null;
      }
      return;
    }
    e.preventDefault();
    const target = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-idx]");
    if (target) {
      const t = Number(target.getAttribute("data-idx"));
      if (!Number.isNaN(t) && t !== d.idx) {
        onMove(d.idx, t);
        d.idx = t;
        setDragIdx(t);
      }
    }
  };

  const handleUp = (e: PointerEvent<HTMLLIElement>) => {
    clearTimer();
    if (drag.current?.active) {
      suppressClick.current = true;
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    }
    drag.current = null;
    setDragIdx(null);
  };

  const handleClick = (id: string) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    setSelected((s) => (s === id ? null : id));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {images.length} image{images.length === 1 ? "" : "s"}
          <span className="ml-1 font-normal normal-case text-zinc-400">· tap to edit, hold to drag</span>
        </h2>
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-medium text-red-500 hover:text-red-600"
        >
          Clear all
        </button>
      </div>
      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-3">
        {images.map((img, i) => {
          const active = selected === img.id;
          return (
            <li
              key={img.id}
              data-idx={i}
              onPointerDown={(e) => handleDown(e, i)}
              onPointerMove={handleMove}
              onPointerUp={handleUp}
              onPointerCancel={handleUp}
              onClick={() => handleClick(img.id)}
              className={[
                "group relative aspect-square cursor-pointer select-none overflow-hidden rounded-lg border bg-zinc-100 transition",
                dragIdx === i ? "scale-95 opacity-50" : "opacity-100",
                active ? "border-brand-500 ring-2 ring-brand-500" : "border-zinc-200",
              ].join(" ")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.name}
                draggable={false}
                className="pointer-events-none h-full w-full object-cover"
              />

              {/* Delete only appears once you tap the photo */}
              {active && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(img.id);
                  }}
                  aria-label="Remove image"
                  className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-base font-bold leading-none text-white shadow active:scale-90"
                >
                  ×
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
