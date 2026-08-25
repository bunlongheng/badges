"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { DropZone } from "@/components/DropZone";
import { Controls } from "@/components/Controls";
import { ImageTray } from "@/components/ImageTray";
import { BadgeSheet } from "@/components/BadgeSheet";
import { Converting } from "@/components/Converting";
import { useImages } from "@/lib/useImages";
import { useSettings } from "@/lib/useSettings";
import { useMeasure } from "@/lib/useMeasure";
import { buildPages, computeLayout } from "@/lib/layout";
import { SHAPES, SIZE_PRESETS } from "@/lib/presets";
import { exportPdf } from "@/lib/pdf";

export default function Home() {
  const { images, add, remove, move, clear, setOffset, converting } = useImages();
  const { settings, update, reset } = useSettings();
  const { ref: stageRef, width } = useMeasure<HTMLDivElement>();
  const sheetsRef = useRef<HTMLDivElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(0);
  const [drag, setDrag] = useState<{ active: boolean; count: number }>({
    active: false,
    count: 0,
  });
  const dragDepth = useRef(0);

  // Global drag-and-drop anywhere on the page, with live feedback.
  useEffect(() => {
    const hasFiles = (e: DragEvent) =>
      Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const countFiles = (e: DragEvent) => {
      const items = e.dataTransfer?.items;
      if (!items) return 0;
      return Array.from(items).filter((i) => i.kind === "file").length;
    };
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth.current += 1;
      setDrag({ active: true, count: countFiles(e) });
    };
    const onOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault(); // required so the browser fires a drop
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDrag((d) => ({ ...d, active: false }));
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      dragDepth.current = 0;
      setDrag({ active: false, count: 0 });
      if (e.dataTransfer?.files?.length) add(e.dataTransfer.files);
    };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragover", onOver);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [add]);

  // Global paste-to-add, with a screen flash for feedback.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files: File[] = [];
      for (const item of Array.from(e.clipboardData?.items ?? [])) {
        if (item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length) {
        add(files);
        setFlash((n) => n + 1);
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [add]);

  const layout = useMemo(() => computeLayout(settings), [settings]);
  // repeat-to-fill was removed; always flow images across pages (one per badge)
  const pages = useMemo(
    () => buildPages(images.length, layout.perPage, false),
    [images.length, layout.perPage]
  );

  const scale = useMemo(() => {
    if (!width) return 0.6;
    // Use the available preview column width (capped) instead of leaving it empty.
    const target = Math.min(width, 900);
    return Math.min(1, target / (layout.paperW * 96));
  }, [width, layout.paperW]);

  const sizePreset =
    SIZE_PRESETS.find((s) => Math.abs(s.inches - settings.sizeIn) < 0.001) ?? SIZE_PRESETS[0];
  const shapeLabel = SHAPES.find((s) => s.id === settings.shape)?.label ?? settings.shape;
  const caption = `${sizePreset.label} (${sizePreset.cm} cm)  ·  ${shapeLabel}${
    settings.shape === "circle" ? "s" : ""
  }  ·  ${layout.perPage} per page  ·  Safe margin ${settings.marginIn}"`;

  const pdfName = `${sizePreset.label.toLowerCase()}-badges.pdf`;

  const handlePdf = useCallback(async () => {
    if (pages.length === 0) return;
    setBusy(true);
    try {
      await exportPdf(pages, images, layout, settings, caption, pdfName);
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("Sorry, the PDF export failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }, [pages, images, layout, settings, caption, pdfName]);

  const handleEmail = useCallback(async () => {
    if (pages.length === 0) return;
    setBusy(true);
    try {
      await exportPdf(pages, images, layout, settings, caption, pdfName);
      // Open a blank Gmail compose so the just-downloaded PDF can be attached.
      window.open(
        "https://mail.google.com/mail/u/0/?view=cm&fs=1&su=" +
          encodeURIComponent("Badge sheets") +
          "&body=" +
          encodeURIComponent("Attaching the badge sheets PDF I just downloaded."),
        "_blank",
        "noopener,noreferrer"
      );
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("Sorry, the PDF export failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }, [pages, images, layout, settings, caption, pdfName]);

  const hasImages = images.length > 0;

  return (
    <div className="min-h-screen">
      {flash > 0 && (
        <div
          key={flash}
          className="paste-flash pointer-events-none fixed inset-0 z-50 bg-gradient-to-b from-brand-400/25 to-transparent"
          aria-hidden="true"
        />
      )}

      {drag.active && (
        <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-brand-600/15 p-6 backdrop-blur-sm">
          <div className="anim-glow flex flex-col items-center gap-4 rounded-3xl border-4 border-dashed border-brand-500 bg-white/95 px-12 py-10 text-center shadow-2xl">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-brand-600"
            >
              <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
              <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            </svg>
            <div className="text-2xl font-bold tracking-tight text-zinc-900">
              {drag.count > 0
                ? `Drop ${drag.count} image${drag.count === 1 ? "" : "s"} to add`
                : "Drop images to add"}
            </div>
            <div className="text-sm text-zinc-500">
              {images.length > 0
                ? `They will be added after your ${images.length} current image${
                    images.length === 1 ? "" : "s"
                  }`
                : "iPhone HEIC is converted automatically"}
            </div>
          </div>
        </div>
      )}

      <Header
        actions={
          hasImages ? (
            <>
              <button
                type="button"
                onClick={() => window.print()}
                className="hidden h-9 items-center rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 sm:inline-flex"
              >
                Print
              </button>
              <button
                type="button"
                onClick={handleEmail}
                disabled={busy}
                className="hidden h-9 items-center rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-60 sm:inline-flex"
              >
                Email
              </button>
              <button
                type="button"
                onClick={handlePdf}
                disabled={busy}
                className="inline-flex h-9 items-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
              >
                {busy ? "Rendering…" : "Download PDF"}
              </button>
            </>
          ) : undefined
        }
      />

      <main className="mx-auto max-w-[1800px] px-3 py-6 sm:px-4">
        {!hasImages ? (
          <section className="mx-auto max-w-2xl py-24">
            <DropZone onFiles={add} />
            {converting > 0 && (
              <div className="mt-5 flex justify-center">
                <Converting count={converting} />
              </div>
            )}
          </section>
        ) : (
          <div className="grid items-start gap-5 lg:grid-cols-[360px_1fr_300px]">
            {/* Left panel: images */}
            <aside className="no-print order-1 rounded-2xl border border-zinc-200 bg-white p-4 lg:sticky lg:top-20">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Images
                </h2>
                <button
                  type="button"
                  onClick={() => addInputRef.current?.click()}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-dashed border-zinc-300 px-2.5 text-xs font-medium text-zinc-600 transition hover:border-brand-400 hover:text-brand-600"
                >
                  <span className="text-sm leading-none">+</span> Add
                </button>
              </div>
              <input
                ref={addInputRef}
                type="file"
                accept="image/*,.heic,.heif,.HEIC,.HEIF,image/heic,image/heif"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) add(e.target.files);
                  e.target.value = "";
                }}
              />
              {converting > 0 && <Converting count={converting} compact />}
              <ImageTray images={images} onRemove={remove} onMove={move} onClear={clear} />
            </aside>

            {/* Center panel: preview stage */}
            <section className="order-3 rounded-2xl border border-zinc-300 bg-zinc-100 p-4 lg:order-2">
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
                      onSetOffset={setOffset}
                      totalPages={pages.length}
                      caption={caption}
                    />
                  ))}
                </div>
              </div>
            </section>

            {/* Right panel: controls */}
            <aside className="no-print order-2 rounded-2xl border border-zinc-200 bg-white p-4 lg:order-3 lg:sticky lg:top-20">
              <Controls settings={settings} update={update} reset={reset} />
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
