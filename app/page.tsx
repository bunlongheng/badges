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
import { exportPdf, exportPng } from "@/lib/pdf";
import { filesFromDataTransfer, expandZips } from "@/lib/readDrop";

export default function Home() {
  const { images, add, remove, move, clear, setOffset, converting, notice, clearNotice } =
    useImages();
  const { settings, update, reset } = useSettings();
  const { ref: stageRef, width } = useMeasure<HTMLDivElement>();
  const sheetsRef = useRef<HTMLDivElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(""); // goes into the PDF filename
  const [flash, setFlash] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false); // phone: settings + photos drawer
  const [exportOpen, setExportOpen] = useState(false); // Download: PNG vs PDF menu
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
      // Recurse dropped folders + expand dropped .zip files, then add.
      if (e.dataTransfer) {
        filesFromDataTransfer(e.dataTransfer).then((files) => {
          if (files.length) add(files);
        });
      }
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

  // The gap control was removed; badges always touch (max fit). Migrate old values.
  useEffect(() => {
    if (settings.gapIn !== 0) update("gapIn", 0);
  }, [settings.gapIn, update]);

  // Track the viewport so the desktop preview can fit the whole page on screen.
  const [vp, setVp] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const layout = useMemo(() => computeLayout(settings), [settings]);
  // repeat-to-fill was removed; always flow images across pages (one per badge)
  const pages = useMemo(
    () => buildPages(images.length, layout.perPage, false),
    [images.length, layout.perPage]
  );

  const scale = useMemo(() => {
    if (!width) return 0.6;
    // Fit within the column, leaving room for the ruler gutter so nothing overflows.
    const byW = Math.min(width - (settings.showGrid ? 30 : 8), 1100) / (layout.paperW * 96);
    // On desktop, also cap by the viewport height so the WHOLE first page is
    // visible at once (no scrolling to see the bottom row). Reserve ~150px for
    // the header + breathing room. Mobile stays width-driven (it scrolls).
    const isDesktop = vp.w >= 1024;
    const byH = isDesktop && vp.h ? (vp.h - 150) / (layout.paperH * 96) : Infinity;
    return Math.max(0.15, Math.min(1.3, byW, byH));
  }, [width, vp.w, vp.h, layout.paperW, layout.paperH, settings.showGrid]);

  const sizePreset =
    SIZE_PRESETS.find((s) => Math.abs(s.inches - settings.sizeIn) < 0.001) ?? SIZE_PRESETS[0];
  const shapeLabel = SHAPES.find((s) => s.id === settings.shape)?.label ?? settings.shape;

  // Filename: {name}-{size}-MMDDYYYY-{h}{mm}-{AM|PM}.pdf, e.g.
  // "emma-large-08262026-450-AM.pdf". Stamped at export time so each is unique.
  const buildPdfName = useCallback(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const date = `${pad(now.getMonth() + 1)}${pad(now.getDate())}${now.getFullYear()}`;
    const ampm = now.getHours() < 12 ? "AM" : "PM";
    const h12 = now.getHours() % 12 || 12;
    const stamp = `${date}-${h12}${pad(now.getMinutes())}-${ampm}`;
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const size = sizePreset.label.toLowerCase();
    const base = slug ? `${slug}-${size}` : `${size}-badges`;
    return `${base}-${stamp}.pdf`;
  }, [name, sizePreset.label]);

  const caption = `${sizePreset.label} (${sizePreset.cm} cm)  ·  ${shapeLabel}${
    settings.shape === "circle" ? "s" : ""
  }  ·  ${layout.perPage} per page  ·  Safe margin ${layout.marginIn.toFixed(2)}"`;

  const handleExport = useCallback(
    async (format: "pdf" | "png") => {
      if (pages.length === 0) return;
      setBusy(true);
      try {
        const run = format === "png" ? exportPng : exportPdf;
        await run(pages, images, layout, settings, caption, buildPdfName());
      } catch (err) {
        console.error(`${format.toUpperCase()} export failed:`, err);
        alert(`Sorry, the ${format.toUpperCase()} export failed. Please try again.`);
      } finally {
        setBusy(false);
      }
    },
    [pages, images, layout, settings, caption, buildPdfName]
  );

  // Private recipients live in .env.local (NEXT_PUBLIC_EMAIL_TO), never in git.
  // The Email button only appears when it's set, so a public build has no personal data.
  const emailTo = (process.env.NEXT_PUBLIC_EMAIL_TO || "")
    .split("&")
    .map((s) => s.trim())
    .filter(Boolean)
    .join(",");

  const handleEmail = useCallback(async () => {
    if (pages.length === 0) return;
    setBusy(true);
    try {
      const fname = buildPdfName();
      // Download the PDF first (the browser can't auto-attach to Gmail web).
      await exportPdf(pages, images, layout, settings, caption, fname);
      // Email subject = the name the user typed (e.g. "Teams Clubs"), not the
      // slugified, size/date-stamped filename. Fall back to a sensible default.
      const subject = name.trim() || `${sizePreset.label} badges`;
      window.open(
        "https://mail.google.com/mail/u/0/?view=cm&fs=1&to=" +
          encodeURIComponent(emailTo) +
          "&su=" +
          encodeURIComponent(subject),
        "_blank",
        "noopener,noreferrer"
      );
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("Sorry, the PDF export failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }, [pages, images, layout, settings, caption, buildPdfName, emailTo, name, sizePreset.label]);

  // Picked/pasted files: expand any .zip into its images first, then add.
  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      add(await expandZips(Array.from(files)));
    },
    [add]
  );

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
  // Require a name before exporting - flag the field red and block Print/Email/Download.
  const nameEmpty = !name.trim();

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
        center={
          hasImages ? (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name required"
              aria-label="File name"
              aria-invalid={nameEmpty}
              className={[
                "h-9 w-44 rounded-lg border bg-white px-3 text-center text-sm text-zinc-800 focus:outline-none focus:ring-2",
                nameEmpty
                  ? "border-red-400 ring-1 ring-red-200 placeholder:text-red-400 focus:border-red-400 focus:ring-red-200"
                  : "border-zinc-200 placeholder:text-zinc-400 focus:border-brand-400 focus:ring-brand-200",
              ].join(" ")}
            />
          ) : undefined
        }
        actions={
          hasImages ? (
            <>
              <button
                type="button"
                onClick={() => window.print()}
                disabled={nameEmpty}
                title={nameEmpty ? "Enter a name first" : undefined}
                className="hidden h-9 items-center rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 sm:inline-flex"
              >
                Print
              </button>
              {emailTo && (
                <button
                  type="button"
                  onClick={handleEmail}
                  disabled={busy || nameEmpty}
                  title={nameEmpty ? "Enter a name first" : undefined}
                  className="hidden h-9 items-center rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 sm:inline-flex"
                >
                  Email
                </button>
              )}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setExportOpen((o) => !o)}
                  disabled={busy || nameEmpty}
                  title={nameEmpty ? "Enter a name first" : undefined}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? "Rendering…" : "Download"}
                  {!busy && <span className="text-[10px] text-zinc-400">▾</span>}
                </button>
                {exportOpen && !busy && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
                    <div className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg">
                      {(["pdf", "png"] as const).map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => {
                            setExportOpen(false);
                            handleExport(fmt);
                          }}
                          className="flex w-full items-center justify-between px-3.5 py-2 text-sm text-zinc-700 transition hover:bg-zinc-100"
                        >
                          <span>{fmt.toUpperCase()}</span>
                          <span className="text-[10px] text-zinc-400">
                            {fmt === "pdf" ? "print-ready" : "image"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
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
                accept="image/*,.heic,.heif,.HEIC,.HEIF,image/heic,image/heif,.zip,application/zip"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </section>
          </>
        ) : (
          <>
            <input
              ref={addInputRef}
              type="file"
              accept="image/*,.heic,.heif,.HEIC,.HEIF,image/heic,image/heif,.zip,application/zip"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />

            {/* Phone: compact toolbar, preview shows immediately below */}
            <div className="mb-3 flex items-center gap-2 lg:hidden">
              <button
                type="button"
                onClick={() => addInputRef.current?.click()}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-dashed border-zinc-300 px-3 text-sm font-medium text-zinc-600"
              >
                <span className="text-base leading-none">+</span> Add
              </button>
              <button
                type="button"
                onClick={() => setMobileOpen((o) => !o)}
                className="inline-flex h-10 flex-1 items-center justify-between rounded-xl border border-zinc-200 bg-white px-3.5 text-sm font-semibold text-zinc-700"
              >
                <span className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  Settings &amp; photos ({images.length})
                </span>
                <span className="text-zinc-400">{mobileOpen ? "▲" : "▾"}</span>
              </button>
            </div>
            {converting > 0 && (
              <div className="mb-3 lg:hidden">
                <Converting count={converting} compact />
              </div>
            )}

            {/* Phone: collapsible photos + controls */}
            {mobileOpen && (
              <div className="mb-4 space-y-4 lg:hidden">
                <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Photos
                  </h2>
                  <ImageTray images={images} onRemove={remove} onMove={move} onClear={clear} />
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <Controls settings={settings} update={update} reset={reset} />
                </div>
              </div>
            )}

          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[340px_minmax(0,1fr)_300px]">
            {/* Left panel: images (desktop only) */}
            <aside className="no-print hidden rounded-2xl border border-zinc-200 bg-white p-4 lg:sticky lg:top-20 lg:block lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-600">
                  Recent Imported
                </h2>
                <button
                  type="button"
                  onClick={() => addInputRef.current?.click()}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-dashed border-zinc-300 px-2.5 text-xs font-medium text-zinc-600 transition hover:border-brand-400 hover:text-brand-600"
                >
                  <span className="text-sm leading-none">+</span> Add
                </button>
              </div>
              {converting > 0 && <Converting count={converting} compact />}
              <ImageTray images={images} onRemove={remove} onMove={move} onClear={clear} />
            </aside>

            {/* Center panel: preview stage (first on phone) */}
            <section className="overflow-x-auto rounded-2xl border border-zinc-300 bg-zinc-100 p-3 sm:p-4 lg:order-2">
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
                      onCycleUnit={() =>
                        update("rulerUnit", settings.rulerUnit === "in" ? "cm" : "in")
                      }
                    />
                  ))}
                </div>
              </div>
            </section>

            {/* Right panel: controls (desktop only) */}
            <aside className="no-print hidden rounded-2xl border border-zinc-200 bg-white p-4 lg:order-3 lg:sticky lg:top-20 lg:block">
              <Controls settings={settings} update={update} reset={reset} />
            </aside>
          </div>
          </>
        )}
      </main>
    </div>
  );
}
