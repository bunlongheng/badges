"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { DropZone } from "@/components/DropZone";
import { Controls } from "@/components/Controls";
import { ImageTray } from "@/components/ImageTray";
import { BadgeSheet } from "@/components/BadgeSheet";
import { useImages } from "@/lib/useImages";
import { useSettings } from "@/lib/useSettings";
import { useMeasure } from "@/lib/useMeasure";
import { buildPages, computeLayout, fitCount } from "@/lib/layout";
import { getPaper } from "@/lib/presets";
import { exportPdf } from "@/lib/pdf";

export default function Home() {
  const { images, add, remove, move, clear } = useImages();
  const { settings, update, reset } = useSettings();
  const { ref: stageRef, width } = useMeasure<HTMLDivElement>();
  const sheetsRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  // Global paste-to-add.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files: File[] = [];
      for (const item of Array.from(e.clipboardData?.items ?? [])) {
        if (item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length) add(files);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [add]);

  const layout = useMemo(() => computeLayout(settings), [settings]);
  const pages = useMemo(
    () => buildPages(images.length, layout.perPage, settings.repeat),
    [images.length, layout.perPage, settings.repeat]
  );

  const paper = getPaper(settings.paperId);
  const usableW = paper.w - settings.marginIn * 2;
  const maxCols = Math.max(1, fitCount(usableW, settings.sizeIn, settings.gapIn));

  const scale = useMemo(() => {
    if (!width) return 0.55;
    const target = Math.min(width, 760);
    return Math.min(1, target / (layout.paperW * 96));
  }, [width, layout.paperW]);

  const handlePdf = useCallback(async () => {
    if (!sheetsRef.current || pages.length === 0) return;
    setBusy(true);
    try {
      await exportPdf(sheetsRef.current, { w: layout.paperW, h: layout.paperH });
    } finally {
      setBusy(false);
    }
  }, [pages.length, layout.paperW, layout.paperH]);

  const hasImages = images.length > 0;

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {!hasImages ? (
          <section className="mx-auto max-w-2xl py-10 text-center">
            <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              Turn images into print-ready badge sheets
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-pretty text-zinc-500 dark:text-zinc-400">
              Drop or paste any images, pick a size and grid, and export a crisp
              PDF or print straight from the browser. Buttons, stickers, name
              tags, party favors - everything stays on your device.
            </p>
            <div className="mt-8">
              <DropZone onFiles={add} />
            </div>
            <ul className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-zinc-400">
              <li>2.125&quot; buttons</li>
              <li>Circle badges</li>
              <li>Cut guides</li>
              <li>Repeat-to-fill</li>
              <li>Light &amp; dark</li>
            </ul>
          </section>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            {/* Sidebar */}
            <aside className="no-print space-y-5 lg:sticky lg:top-20 lg:self-start">
              <DropZone onFiles={add} compact />
              <ImageTray images={images} onRemove={remove} onMove={move} onClear={clear} />
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <Controls settings={settings} update={update} reset={reset} maxCols={maxCols} />
              </div>
            </aside>

            {/* Preview */}
            <section className="space-y-4">
              <div className="no-print flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-100">
                    {pages.length}
                  </span>{" "}
                  page{pages.length === 1 ? "" : "s"} ·{" "}
                  <span className="font-semibold text-zinc-800 dark:text-zinc-100">
                    {layout.columns}×{layout.rows}
                  </span>{" "}
                  grid · {settings.sizeIn}&quot; badges
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Print
                  </button>
                  <button
                    type="button"
                    onClick={handlePdf}
                    disabled={busy}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
                  >
                    {busy ? "Rendering…" : "Download PDF"}
                  </button>
                </div>
              </div>

              <div ref={stageRef} className="print-root">
                <div ref={sheetsRef} className="flex flex-col items-center gap-6">
                  {pages.map((page, i) => (
                    <BadgeSheet
                      key={i}
                      page={page}
                      pageIndex={i}
                      images={images}
                      layout={layout}
                      settings={settings}
                      scale={scale}
                    />
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
