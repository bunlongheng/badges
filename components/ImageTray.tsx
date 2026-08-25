"use client";

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
  if (images.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {images.length} image{images.length === 1 ? "" : "s"}
        </h2>
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-medium text-red-500 hover:text-red-600"
        >
          Clear all
        </button>
      </div>
      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-4">
        {images.map((img, i) => (
          <li
            key={img.id}
            className="group relative aspect-square overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt={img.name} className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-between bg-black/40 p-1 opacity-0 transition group-hover:opacity-100">
              <button
                type="button"
                onClick={() => onMove(i, i - 1)}
                disabled={i === 0}
                aria-label="Move left"
                className="rounded bg-white/90 px-1 text-xs text-zinc-800 disabled:opacity-30"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => onRemove(img.id)}
                aria-label="Remove image"
                className="rounded bg-red-500 px-1.5 text-xs font-bold text-white"
              >
                ×
              </button>
              <button
                type="button"
                onClick={() => onMove(i, i + 1)}
                disabled={i === images.length - 1}
                aria-label="Move right"
                className="rounded bg-white/90 px-1 text-xs text-zinc-800 disabled:opacity-30"
              >
                ›
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
