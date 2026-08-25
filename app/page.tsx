"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { Controls } from "@/components/Controls";
import { ImageTray } from "@/components/ImageTray";
import { BadgeSheet } from "@/components/BadgeSheet";
import { Converting } from "@/components/Converting";
import { Aurora } from "@/components/Aurora";
import { useImages } from "@/lib/useImages";
import { useSettings } from "@/lib/useSettings";
import { useMeasure } from "@/lib/useMeasure";
import { buildPages, computeLayout } from "@/lib/layout";
import { SHAPES, SIZE_PRESETS } from "@/lib/presets";
import { exportPdf } from "@/lib/pdf";

export default function Home() {
  const { images, add, remove, move, clear, setOffset, converting, notice, clearNotice } =
    useImages();
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

  // Auto-dismiss the duplicate toast.
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(clearNotice, 3200);
    return () => clearTimeout(t);
  }, [notice, clearNotice]);

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

  const loadSamples = useCallback(async () => {
    try {
      const files = await Promise.all(
        ["s1", "s2", "s3", "s4", "s5", "s6"].map(async (n) => {
          const res = await fetch(`/samples/${n}.jpg`);
          const blob = await res.blob();
          return new File([blob], `${n}.jpg`, { type: "image/jpeg" });
        })
      );
      add(files);
    } catch {
      // ignore fetch failures
    }
  }, [add]);

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

      {notice && (
        <div
          key={notice.nonce}
          className="anim-rise fixed bottom-5 left-1/2 z-[70] -translate-x-1/2"
          role="status"
        >
          <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 shadow-lg">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M15 9l-6 6M9 9l6 6" />
            </svg>
            {notice.text}
          </div>
        </div>
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
          <>
            <Aurora />
            <section className="relative mx-auto flex min-h-[calc(100vh-9rem)] max-w-3xl flex-col items-center justify-center py-10 text-center">
              <div className="float-in">
                <svg
                  width="34"
                  height="34"
                  viewBox="0 0 24 24"
                  className="mx-auto text-brand-500 anim-glow rounded-full"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 2l1.9 5.6a3 3 0 0 0 1.9 1.9L21.5 11.5l-5.6 1.9a3 3 0 0 0-1.9 1.9L12 21l-1.9-5.6a3 3 0 0 0-1.9-1.9L2.5 11.5l5.6-1.9a3 3 0 0 0 1.9-1.9L12 2z" />
                </svg>
                <h1 className="mt-3 bg-gradient-to-b from-zinc-900 to-zinc-600 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl">
                  Create your badges
                </h1>
                <p className="mt-2 text-zinc-500">
                  Turn any image into a print-ready badge in seconds
                </p>
              </div>

              <button
                type="button"
                onClick={() => addInputRef.current?.click()}
                style={{ animationDelay: "0.08s" }}
                className="float-in group mt-8 w-full rounded-3xl border border-white/70 bg-white/60 p-8 shadow-xl shadow-indigo-200/40 backdrop-blur transition hover:border-brand-300 hover:shadow-indigo-300/50 sm:p-10"
              >
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-600 transition group-hover:scale-105">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
                    <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                  </svg>
                </span>
                <div className="mt-4 text-xl font-semibold text-zinc-900">Drop your images here</div>
                <div className="mt-1 text-sm text-zinc-500">
                  or click to <span className="font-medium text-brand-600">browse your files</span>
                </div>
                <span className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-6 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition group-hover:bg-brand-700">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                  Choose Images
                </span>
                <div className="mt-4 text-xs text-zinc-400">
                  PNG · JPG · HEIC · WEBP — 100% private, in your browser
                </div>
              </button>

              {converting > 0 && (
                <div className="float-in mt-5">
                  <Converting count={converting} />
                </div>
              )}

              <div className="float-in mt-9" style={{ animationDelay: "0.16s" }}>
                <p className="text-sm text-zinc-400">Or try an example</p>
                <div className="mt-3 flex justify-center gap-3">
                  {["s1", "s2", "s3"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={loadSamples}
                      className="h-20 w-28 overflow-hidden rounded-xl border border-white/70 shadow-md transition hover:-translate-y-1 hover:shadow-xl"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/samples/${s}.jpg`} alt="Sample" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div
                className="float-in mt-10 flex w-full max-w-lg items-center justify-between rounded-2xl border border-white/70 bg-white/60 px-6 py-4 backdrop-blur"
                style={{ animationDelay: "0.24s" }}
              >
                {[
                  { n: 1, t: "Upload", d: "Add your images" },
                  { n: 2, t: "Customize", d: "Size, shape, layout" },
                  { n: 3, t: "Export", d: "Print or PDF" },
                ].map((step, i) => (
                  <div key={step.n} className="flex flex-1 items-center">
                    <div className="flex flex-col items-center text-center">
                      <span
                        className={[
                          "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                          step.n === 1
                            ? "bg-brand-600 text-white"
                            : "border border-zinc-300 text-zinc-400",
                        ].join(" ")}
                      >
                        {step.n}
                      </span>
                      <div className="mt-1.5 text-xs font-semibold text-zinc-700">{step.t}</div>
                      <div className="hidden text-[11px] text-zinc-400 sm:block">{step.d}</div>
                    </div>
                    {i < 2 && <div className="mx-2 h-px flex-1 border-t border-dashed border-zinc-300" />}
                  </div>
                ))}
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
            </section>
          </>
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
