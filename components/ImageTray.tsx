"use client";

import { useState } from "react";
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
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  if (images.length === 0) return null;

  const drop = (target: number) => {
    if (drag !== null && drag !== target) onMove(drag, target);
    setDrag(null);
    setOver(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {images.length} image{images.length === 1 ? "" : "s"}
          <span className="ml-1 font-normal normal-case text-zinc-400">· drag to reorder</span>
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
        {images.map((img, i) => (
          <li
            key={img.id}
            draggable
            onDragStart={() => setDrag(i)}
            onDragEnter={(e) => {
              e.preventDefault();
              setOver(i);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => drop(i)}
            onDragEnd={() => {
              setDrag(null);
              setOver(null);
            }}
            className={[
              "anim-pop group relative aspect-square cursor-grab overflow-hidden rounded-lg border bg-zinc-100 transition active:cursor-grabbing",
              drag === i ? "scale-95 opacity-40" : "opacity-100",
              over === i && drag !== i
                ? "border-brand-500 ring-2 ring-brand-500"
                : "border-zinc-200",
            ].join(" ")}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.name}
              draggable={false}
              className="pointer-events-none h-full w-full object-cover"
            />
            <span className="absolute left-1 top-1 rounded bg-black/55 px-1.5 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
              {i + 1}
            </span>
            <button
              type="button"
              onClick={() => onRemove(img.id)}
              aria-label="Remove image"
              className="absolute right-1 top-1 rounded-full bg-red-500 px-1.5 text-xs font-bold leading-5 text-white opacity-0 transition group-hover:opacity-100"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
