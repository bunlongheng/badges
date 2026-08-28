import type { BadgeImage } from "./useImages";
import type { SheetLayout } from "./layout";
import type { Settings } from "./presets";
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

function roundRectPath(ctx: CanvasRenderingContext2D, s: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.arcTo(s, 0, s, s, r);
  ctx.arcTo(s, s, 0, s, r);
  ctx.arcTo(0, s, 0, 0, r);
  ctx.arcTo(0, 0, s, 0, r);
  ctx.closePath();
}

/** Render one badge (image cropped to shape, with focal offset + style) to a canvas. */
function renderBadge(
  img: HTMLImageElement,
  settings: Settings,
  offsetX: number,
  offsetY: number,
  autoColor?: string
): HTMLCanvasElement {
  const s = Math.round(settings.sizeIn * DPI);
  const canvas = document.createElement("canvas");
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext("2d")!;

  // Fill the whole square white first: circle/rounded corners become white, which
  // is invisible on the white paper and lets us export as (tiny) JPEG, not PNG.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, s, s);

  ctx.save();
  // Clip to the badge shape.
  if (settings.shape === "circle") {
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
    ctx.clip();
  } else if (settings.shape === "rounded") {
    roundRectPath(ctx, s, s * 0.12);
    ctx.clip();
  }

  // Background.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, s, s);

  // Draw the image with object-fit cover/contain + object-position offset.
  // Padding insets the artwork inside an inner box (matches the on-screen padding).
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (iw && ih) {
    const pad = settings.padding ? (s * settings.paddingPct) / 100 : 0;
    const inner = s - 2 * pad;
    let scale: number;
    if (settings.fit === "cover") scale = Math.max(inner / iw, inner / ih);
    else scale = Math.min(inner / iw, inner / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    let dx: number, dy: number;
    if (settings.fit === "cover") {
      dx = pad - (dw - inner) * (offsetX / 100);
      dy = pad - (dh - inner) * (offsetY / 100);
    } else {
      dx = pad + (inner - dw) / 2;
      dy = pad + (inner - dh) / 2;
    }
    // Keep a cover image from bleeding into the padding band.
    if (pad > 0) {
      ctx.beginPath();
      ctx.rect(pad, pad, inner, inner);
      ctx.clip();
    }
    ctx.drawImage(img, dx, dy, dw, dh);
  }
  ctx.restore();

  // Border around the badge (none / black / the photo's primary colour).
  let strokeColor: string | null = null;
  if (settings.border === "black") {
    strokeColor = "#000000";
  } else if (settings.border === "auto") {
    strokeColor = autoColor ?? "#000000";
  }
  if (strokeColor) {
    ctx.save();
    ctx.lineWidth = 0.015 * s;
    ctx.strokeStyle = strokeColor;
    // Border sits at the TRUE badge edge (the photo fills up to under it).
    const inset = ctx.lineWidth / 2;
    if (settings.shape === "circle") {
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s / 2 - inset, 0, Math.PI * 2);
      ctx.stroke();
    } else if (settings.shape === "rounded") {
      ctx.translate(inset, inset);
      roundRectPath(ctx, s - ctx.lineWidth, s * 0.12);
      ctx.stroke();
    } else {
      ctx.strokeRect(inset, inset, s - ctx.lineWidth, s - ctx.lineWidth);
    }
    ctx.restore();
  }

  return canvas;
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
  const { paperW, paperH, columns, cellIn } = layout;
  const orientation = paperW > paperH ? "landscape" : "portrait";
  const pdf = new jsPDF({ orientation, unit: "in", format: [paperW, paperH] });

  // Spread badges evenly across the safe area (matches the on-screen space-evenly).
  const usableW = paperW - layout.marginIn * 2;
  const usableH = paperH - layout.marginIn * 2;
  const gapX = Math.max(0, (usableW - columns * cellIn) / (columns + 1));

  for (let p = 0; p < pages.length; p++) {
    if (p > 0) pdf.addPage([paperW, paperH], orientation);
    const cells = pages[p];
    // Rows needed for THIS page, so leftover height becomes even gaps.
    const pageRows = Math.max(1, Math.ceil(cells.length / columns));
    const gapY = Math.max(0, (usableH - pageRows * cellIn) / (pageRows + 1));

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
      const x = layout.marginIn + gapX * (col + 1) + cellIn * col;
      const y = layout.marginIn + gapY * (row + 1) + cellIn * row;

      const el = await loadImage(img.url);
      const canvas = renderBadge(el, settings, img.offsetX, img.offsetY, img.color);
      // JPEG (white corners) keeps the PDF email-friendly small.
      pdf.addImage(canvas.toDataURL("image/jpeg", JPEG_QUALITY), "JPEG", x, y, cellIn, cellIn, undefined, "FAST");

      // Round badges: a thin dashed circle 5% BIGGER than the badge - a cutting
      // buffer sitting just outside the true edge.
      if (settings.cutGuides && settings.shape === "circle") {
        pdf.setDrawColor(140);
        pdf.setLineDashPattern([0.04, 0.03], 0);
        pdf.setLineWidth(0.008);
        pdf.circle(x + cellIn / 2, y + cellIn / 2, cellIn * 0.525, "S");
        pdf.setLineDashPattern([], 0);
      }

      // Extracted name: straight, bold, horizontal near the bottom - kid-readable.
      if (settings.showNames) {
        const name = extractName(img.name);
        if (name) {
          const tx = x + cellIn / 2;
          const ty = y + cellIn * 0.92;
          pdf.setFont("helvetica", "bold");
          // nameSize is a percent of the badge diameter (viewBox units), matches screen.
          pdf.setFontSize(cellIn * (settings.nameSize / 100) * 72);
          // White halo (4 offsets) so black text stays readable over busy photos.
          const halo = cellIn * (settings.nameSize / 100) * 0.09;
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
        (_, i) => layout.marginIn + gapX / 2 + i * (cellIn + gapX)
      );
      const ys = Array.from(
        { length: pageRows + 1 },
        (_, j) => layout.marginIn + gapY / 2 + j * (cellIn + gapY)
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
