import type { BadgeImage } from "./useImages";
import type { SheetLayout } from "./layout";
import type { Settings } from "./presets";
import { stickerPlacements } from "./bomb";
import { extractName } from "./text";

const DPI = 240; // plenty for a small badge; keeps file size sane
const JPEG_QUALITY = 0.82;

const imgCache = new Map<string, HTMLImageElement>();

function loadImage(url: string): Promise<HTMLImageElement> {
  const cached = imgCache.get(url);
  if (cached?.complete) return Promise.resolve(cached);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      imgCache.set(url, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = url;
  });
}

function roundRectPath(ctx: CanvasRenderingContext2D, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.arcTo(w, 0, w, h, r);
  ctx.arcTo(w, h, 0, h, r);
  ctx.arcTo(0, h, 0, 0, r);
  ctx.arcTo(0, 0, w, 0, r);
  ctx.closePath();
}

/**
 * Render one badge to a canvas sized to the cell (cwIn x chIn inches). Square/circle
 * draw a centred square badge; "original" fills the whole (possibly wide) cell at the
 * image's own aspect. Matches the on-screen BadgeSheet exactly.
 */
function renderBadge(
  img: HTMLImageElement,
  settings: Settings,
  offsetX: number,
  offsetY: number,
  autoColor: string | undefined,
  cwIn: number,
  chIn: number,
  boxWIn: number,
  boxHIn: number
): HTMLCanvasElement {
  const cw = Math.round(cwIn * DPI);
  const ch = Math.round(chIn * DPI);
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d")!;

  // Fill the whole cell white first: circle/rounded corners + band side-margins
  // become white, invisible on the paper and lets us export as (tiny) JPEG.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, cw, ch);

  // The badge box is centred in the cell (smaller than the cell in Extra Large
  // bands so the shape stays inside its third).
  const isOriginal = settings.shape === "original";
  const bw = Math.round(boxWIn * DPI);
  const bh = Math.round(boxHIn * DPI);
  const bmin = Math.min(bw, bh);
  const bx = Math.round((cw - bw) / 2);
  const by = Math.round((ch - bh) / 2);

  ctx.save();
  ctx.translate(bx, by);
  // Clip to the badge shape (box coords 0..bw, 0..bh). Square + original: no clip.
  if (settings.shape === "circle") {
    ctx.beginPath();
    ctx.arc(bw / 2, bh / 2, bmin / 2, 0, Math.PI * 2);
    ctx.clip();
  } else if (settings.shape === "rounded") {
    roundRectPath(ctx, bw, bh, bmin * 0.12);
    ctx.clip();
  }

  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (iw && ih) {
    // Inscribe a Fit image inside a circle badge so its corners aren't clipped.
    const inscribe =
      settings.shape === "circle" && settings.fit === "contain" ? (bmin * (1 - 1 / Math.SQRT2)) / 2 : 0;
    const pad = (settings.padding ? (bmin * settings.paddingPct) / 100 : 0) + inscribe;
    const innerW = bw - 2 * pad;
    const innerH = bh - 2 * pad;
    const cover = settings.fit === "cover" && !isOriginal;
    const scale = cover
      ? Math.max(innerW / iw, innerH / ih)
      : Math.min(innerW / iw, innerH / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    let dx: number, dy: number;
    if (cover) {
      dx = pad - (dw - innerW) * (offsetX / 100);
      dy = pad - (dh - innerH) * (offsetY / 100);
    } else {
      dx = pad + (innerW - dw) / 2;
      dy = pad + (innerH - dh) / 2;
    }
    // In Fill (cover), clip the padded image to the badge shape; Fit shows all.
    if (pad > 0 && cover) {
      ctx.beginPath();
      if (settings.shape === "circle") ctx.arc(bw / 2, bh / 2, innerW / 2, 0, Math.PI * 2);
      else ctx.rect(pad, pad, innerW, innerH);
      ctx.clip();
    }
    ctx.drawImage(img, dx, dy, dw, dh);
  }
  ctx.restore();

  // Border around the badge (none / black / the photo's primary colour). Skipped
  // for "original" - it has no fixed frame to outline.
  let strokeColor: string | null = null;
  if (settings.border === "black") strokeColor = "#000000";
  else if (settings.border === "auto") strokeColor = autoColor ?? "#000000";
  if (strokeColor && !isOriginal) {
    ctx.save();
    ctx.translate(bx, by);
    ctx.lineWidth = 0.015 * bmin;
    ctx.strokeStyle = strokeColor;
    const inset = ctx.lineWidth / 2;
    if (settings.shape === "circle") {
      ctx.beginPath();
      ctx.arc(bw / 2, bh / 2, bmin / 2 - inset, 0, Math.PI * 2);
      ctx.stroke();
    } else if (settings.shape === "rounded") {
      ctx.translate(inset, inset);
      roundRectPath(ctx, bw - ctx.lineWidth, bh - ctx.lineWidth, bmin * 0.12);
      ctx.stroke();
    } else {
      ctx.strokeRect(inset, inset, bw - ctx.lineWidth, bh - ctx.lineWidth);
    }
    ctx.restore();
  }

  return canvas;
}

/** Trigger a browser download for a Blob with a real filename. Uses an object
 * URL (not a giant data: URL) so Chrome keeps the filename instead of a UUID. */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** Canvas -> PNG Blob (promise wrapper around toBlob). */
function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
  });
}

/**
 * Export each page as a PNG (one file per page). Same layout math as the PDF,
 * drawn onto a full-page canvas at print DPI.
 */
export async function exportPng(
  pages: number[][],
  images: BadgeImage[],
  layout: SheetLayout,
  settings: Settings,
  caption = "",
  filename = "badges.pdf"
): Promise<void> {
  const { paperW, paperH, columns, cellW, cellH } = layout;
  const usableW = paperW - layout.marginIn * 2;
  const usableH = paperH - layout.marginIn * 2;
  const base = filename.replace(/\.(pdf|png)$/i, "");
  const isOriginal = settings.shape === "original";

  for (let p = 0; p < pages.length; p++) {
    const cells = pages[p];
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(paperW * DPI);
    canvas.height = Math.round(paperH * DPI);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Sticker bomb: scatter each image (rotated/scaled), no grid, no cut lines.
    if (settings.bomb) {
      const s = settings.sizeIn;
      const sticks = stickerPlacements(cells.length, settings, layout);
      for (let idx = 0; idx < cells.length; idx++) {
        const img = images[cells[idx]];
        if (!img) continue;
        const st = sticks[idx];
        const el = await loadImage(img.url);
        const badge = renderBadge(el, settings, img.offsetX, img.offsetY, img.color, s, s, s, s);
        ctx.save();
        ctx.translate(st.cx * DPI, st.cy * DPI);
        ctx.rotate((st.angle * Math.PI) / 180);
        ctx.scale(st.scale, st.scale);
        ctx.drawImage(badge, (-s / 2) * DPI, (-s / 2) * DPI, s * DPI, s * DPI);
        ctx.restore();
      }
      if (caption) {
        ctx.save();
        ctx.fillStyle = "#9aa0a6";
        ctx.textAlign = "center";
        ctx.font = `500 ${0.085 * DPI}px ui-sans-serif, system-ui, sans-serif`;
        ctx.fillText(`${caption}  ·  Page ${p + 1} of ${pages.length}`, (paperW / 2) * DPI, (paperH - Math.max(0.16, layout.marginIn)) * DPI);
        ctx.restore();
      }
      const suffixB = pages.length > 1 ? `-p${p + 1}` : "";
      downloadBlob(await canvasToPng(canvas), `${base}${suffixB}.png`);
      continue;
    }

    const pageRows = Math.max(1, Math.ceil(cells.length / columns));
    const partial = cells.length < columns;
    const gapX = partial ? 0 : Math.max(0, (usableW - columns * cellW) / (columns + 1));
    const gapY = partial ? 0 : Math.max(0, (usableH - pageRows * cellH) / (pageRows + 1));
    // Badge box within each cell. In Extra Large bands, inset the height so the
    // shape stays inside its third; square/circle centre a square.
    const boxH0 = settings.bands > 0 ? cellH * 0.86 : cellH;
    const boxW = isOriginal ? cellW : Math.min(cellW, boxH0);
    const boxH = isOriginal ? boxH0 : Math.min(cellW, boxH0);
    const boxMin = Math.min(boxW, boxH);

    for (let idx = 0; idx < cells.length; idx++) {
      const img = images[cells[idx]];
      if (!img) continue;
      const col = idx % columns;
      const row = Math.floor(idx / columns);
      const x = layout.marginIn + gapX * (col + 1) + cellW * col;
      const y = layout.marginIn + gapY * (row + 1) + cellH * row;
      const el = await loadImage(img.url);
      const badge = renderBadge(el, settings, img.offsetX, img.offsetY, img.color, cellW, cellH, boxW, boxH);
      ctx.drawImage(badge, Math.round(x * DPI), Math.round(y * DPI), Math.round(cellW * DPI), Math.round(cellH * DPI));

      if (settings.showNames) {
        const name = extractName(img.name);
        if (name) {
          const nx = x + cellW / 2;
          const ny = y + (cellH - boxH) / 2 + boxH * 0.92;
          ctx.save();
          ctx.fillStyle = "#000000";
          ctx.textAlign = "center";
          ctx.font = `800 ${boxMin * (settings.nameSize / 100) * DPI}px ui-sans-serif, system-ui, sans-serif`;
          ctx.lineWidth = boxMin * (settings.nameSize / 100) * DPI * 0.18;
          ctx.strokeStyle = "#ffffff";
          ctx.strokeText(name, nx * DPI, ny * DPI);
          ctx.fillText(name, nx * DPI, ny * DPI);
          ctx.restore();
        }
      }
    }

    // Straight cut lines (same as PDF).
    if (settings.cutGuides) {
      const xs = Array.from({ length: columns + 1 }, (_, i) => layout.marginIn + gapX / 2 + i * (cellW + gapX));
      const ys = Array.from({ length: pageRows + 1 }, (_, j) => layout.marginIn + gapY / 2 + j * (cellH + gapY));
      ctx.save();
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 0.01 * DPI;
      for (const gx of xs) { ctx.beginPath(); ctx.moveTo(gx * DPI, ys[0] * DPI); ctx.lineTo(gx * DPI, ys[ys.length - 1] * DPI); ctx.stroke(); }
      for (const gy of ys) { ctx.beginPath(); ctx.moveTo(xs[0] * DPI, gy * DPI); ctx.lineTo(xs[xs.length - 1] * DPI, gy * DPI); ctx.stroke(); }
      ctx.restore();
    }

    if (caption) {
      ctx.save();
      ctx.fillStyle = "#9aa0a6";
      ctx.textAlign = "center";
      ctx.font = `500 ${0.085 * DPI}px ui-sans-serif, system-ui, sans-serif`;
      ctx.fillText(`${caption}  ·  Page ${p + 1} of ${pages.length}`, (paperW / 2) * DPI, (paperH - Math.max(0.16, layout.marginIn)) * DPI);
      ctx.restore();
    }

    const suffix = pages.length > 1 ? `-p${p + 1}` : "";
    downloadBlob(await canvasToPng(canvas), `${base}${suffix}.png`);
  }
}

/**
 * Build the PDF by drawing each badge at exact inch coordinates. No html2canvas,
 * so Tailwind's oklch/lab colors never reach a parser.
 */
export async function exportPdf(
  pages: number[][],
  images: BadgeImage[],
  layout: SheetLayout,
  settings: Settings,
  caption = "",
  filename = "badges.pdf"
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const { paperW, paperH, columns, cellW, cellH } = layout;
  const orientation = paperW > paperH ? "landscape" : "portrait";
  const pdf = new jsPDF({ orientation, unit: "in", format: [paperW, paperH] });

  // Spread badges evenly across the safe area (matches the on-screen space-evenly).
  const usableW = paperW - layout.marginIn * 2;
  const usableH = paperH - layout.marginIn * 2;
  const isOriginal = settings.shape === "original";
  // Extra Large bands: inset the badge height so it stays inside its third.
  const boxH0 = settings.bands > 0 ? cellH * 0.86 : cellH;
  const boxW = isOriginal ? cellW : Math.min(cellW, boxH0);
  const boxH = isOriginal ? boxH0 : Math.min(cellW, boxH0);
  const boxMin = Math.min(boxW, boxH);

  for (let p = 0; p < pages.length; p++) {
    if (p > 0) pdf.addPage([paperW, paperH], orientation);
    const cells = pages[p];

    // Sticker bomb: render the whole scattered page to a canvas and place it, so
    // the PDF matches the PNG/preview exactly (rotation + overlap).
    if (settings.bomb) {
      const s = settings.sizeIn;
      const cv = document.createElement("canvas");
      cv.width = Math.round(paperW * DPI);
      cv.height = Math.round(paperH * DPI);
      const c2 = cv.getContext("2d")!;
      c2.fillStyle = "#ffffff";
      c2.fillRect(0, 0, cv.width, cv.height);
      const sticks = stickerPlacements(cells.length, settings, layout);
      for (let idx = 0; idx < cells.length; idx++) {
        const img = images[cells[idx]];
        if (!img) continue;
        const st = sticks[idx];
        const el = await loadImage(img.url);
        const badge = renderBadge(el, settings, img.offsetX, img.offsetY, img.color, s, s, s, s);
        c2.save();
        c2.translate(st.cx * DPI, st.cy * DPI);
        c2.rotate((st.angle * Math.PI) / 180);
        c2.scale(st.scale, st.scale);
        c2.drawImage(badge, (-s / 2) * DPI, (-s / 2) * DPI, s * DPI, s * DPI);
        c2.restore();
      }
      if (caption) {
        c2.save();
        c2.fillStyle = "#9aa0a6";
        c2.textAlign = "center";
        c2.font = `500 ${0.085 * DPI}px ui-sans-serif, system-ui, sans-serif`;
        c2.fillText(`${caption}  ·  Page ${p + 1} of ${pages.length}`, (paperW / 2) * DPI, (paperH - Math.max(0.16, layout.marginIn)) * DPI);
        c2.restore();
      }
      pdf.addImage(cv.toDataURL("image/jpeg", 0.9), "JPEG", 0, 0, paperW, paperH, undefined, "FAST");
      continue;
    }

    // Rows needed for THIS page, so leftover height becomes even gaps.
    const pageRows = Math.max(1, Math.ceil(cells.length / columns));
    // Only a sparse page (fewer than one full row) packs top-left so a lone
    // leftover badge lands where #1 would; anything with a full row spreads
    // evenly to fill the sheet. Matches the on-screen layout.
    const partial = cells.length < columns;
    const gapX = partial ? 0 : Math.max(0, (usableW - columns * cellW) / (columns + 1));
    const gapY = partial ? 0 : Math.max(0, (usableH - pageRows * cellH) / (pageRows + 1));

    if (caption) {
      pdf.setFontSize(6);
      pdf.setTextColor(150);
      pdf.text(
        `${caption}  ·  Page ${p + 1} of ${pages.length}`,
        paperW / 2,
        paperH - Math.max(0.12, layout.marginIn * 0.5),
        { align: "center" }
      );
    }
    for (let idx = 0; idx < cells.length; idx++) {
      const img = images[cells[idx]];
      if (!img) continue;
      const col = idx % columns;
      const row = Math.floor(idx / columns);
      const x = layout.marginIn + gapX * (col + 1) + cellW * col;
      const y = layout.marginIn + gapY * (row + 1) + cellH * row;
      // Centre of the badge box within the (possibly wide) cell.
      const boxCx = x + cellW / 2;
      const boxTop = y + (cellH - boxH) / 2;

      const el = await loadImage(img.url);
      const canvas = renderBadge(el, settings, img.offsetX, img.offsetY, img.color, cellW, cellH, boxW, boxH);
      // JPEG (white corners) keeps the PDF email-friendly small.
      pdf.addImage(canvas.toDataURL("image/jpeg", JPEG_QUALITY), "JPEG", x, y, cellW, cellH, undefined, "FAST");

      // Round badges: a thin dashed circle 5% BIGGER than the badge - a cutting
      // buffer sitting just outside the true edge.
      if (settings.cutGuides && settings.shape === "circle") {
        pdf.setDrawColor(140);
        pdf.setLineDashPattern([0.04, 0.03], 0);
        pdf.setLineWidth(0.008);
        pdf.circle(boxCx, y + cellH / 2, boxMin * 0.525, "S");
        pdf.setLineDashPattern([], 0);
      }

      // Extracted name: straight, bold, horizontal near the bottom - kid-readable.
      if (settings.showNames) {
        const name = extractName(img.name);
        if (name) {
          const tx = boxCx;
          const ty = boxTop + boxH * 0.92;
          pdf.setFont("helvetica", "bold");
          // nameSize is a percent of the badge diameter (viewBox units), matches screen.
          pdf.setFontSize(boxMin * (settings.nameSize / 100) * 72);
          // White halo (4 offsets) so black text stays readable over busy photos.
          const halo = boxMin * (settings.nameSize / 100) * 0.09;
          pdf.setTextColor(255);
          for (const [dx, dy] of [[-halo, 0], [halo, 0], [0, -halo], [0, halo]]) {
            pdf.text(name, tx + dx, ty + dy, { align: "center" });
          }
          pdf.setTextColor(0);
          pdf.text(name, tx, ty, { align: "center" });
          pdf.setFont("helvetica", "normal");
        }
      }
    }

    // Cut grid: straight SOLID lines running full length between every column
    // and row, so the sheet cuts into clean strips in a few guillotine passes.
    // Lines sit in the gap centers, so each badge ends up centered in its cell.
    if (settings.cutGuides) {
      const xs = Array.from(
        { length: columns + 1 },
        (_, i) => layout.marginIn + gapX / 2 + i * (cellW + gapX)
      );
      const ys = Array.from(
        { length: pageRows + 1 },
        (_, j) => layout.marginIn + gapY / 2 + j * (cellH + gapY)
      );
      pdf.setDrawColor(0); // black - easy to see when cutting
      pdf.setLineWidth(0.01);
      pdf.setLineDashPattern([], 0); // solid
      const top = ys[0];
      const bottom = ys[ys.length - 1];
      const left = xs[0];
      const right = xs[xs.length - 1];
      for (const x of xs) pdf.line(x, top, x, bottom);
      for (const y of ys) pdf.line(left, y, right, y);
    }
  }

  pdf.save(filename);
}
