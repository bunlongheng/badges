"use client";

import { useRef } from "react";

export function DropZone({
  onFiles,
  compact = false,
}: {
  onFiles: (files: FileList | File[]) => void;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Drops are handled globally (window listener) so files can land anywhere on
  // the page; this element is the click-to-upload target.
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      className={[
        "group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center transition",
        compact ? "gap-1 p-4" : "gap-2 p-10",
        "border-zinc-300 bg-white hover:border-brand-400 hover:bg-zinc-50",
      ].join(" ")}
    >
      <svg
        width={compact ? 22 : 34}
        height={compact ? 22 : 34}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-brand-500"
      >
        <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
        <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </svg>
      <div className={compact ? "text-sm" : "text-base"}>
        <span className="font-semibold text-zinc-800">Drop images</span>{" "}
        <span className="text-zinc-500">or click</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif,.HEIC,.HEIF,image/heic,image/heif"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) onFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
