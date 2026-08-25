import type { BadgeImage } from "./useImages";
import type { SheetLayout } from "./layout";
import type { Settings } from "./presets";

const KIDS_COLORS = ["#ff6b6b", "#ffd93d", "#6bcB77", "#4d96ff", "#c780fa", "#ff9f45"];
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
  index: number,
  settings: Settings,
  offsetX: number,
  offsetY: number
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
  ctx.fillStyle = settings.style === "neon" ? "#0d0d0d" : "#ffffff";
  ctx.fillRect(0, 0, s, s);

  // Draw the image with object-fit cover/contain + object-position offset.
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (iw && ih) {
    let scale: number;
    if (settings.fit === "cover") scale = Math.max(s / iw, s / ih);
    else scale = Math.min(s / iw, s / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    let dx: number, dy: number;
    if (settings.fit === "cover") {
      dx = -(dw - s) * (offsetX / 100);
      dy = -(dh - s) * (offsetY / 100);
    } else {
      dx = (s - dw) / 2;
      dy = (s - dh) / 2;
    }
    ctx.drawImage(img, dx, dy, dw, dh);
  }
  ctx.restore();

  // Style border.
  if (settings.style === "kids" || settings.style === "neon") {
    ctx.save();
    ctx.lineWidth = (settings.style === "neon" ? 0.02 : 0.03) * s;
    ctx.strokeStyle = settings.style === "neon" ? "#00ffcc" : KIDS_COLORS[index % KIDS_COLORS.length];
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
  const { paperW, paperH, columns, rows, cellIn } = layout;
  const orientation = paperW > paperH ? "landscape" : "portrait";
  const pdf = new jsPDF({ orientation, unit: "in", format: [paperW, paperH] });

  const gap = settings.gapIn;
  const gridW = columns * cellIn + (columns - 1) * gap;
  const gridH = rows * cellIn + (rows - 1) * gap;
  const startX = settings.marginIn + (paperW - settings.marginIn * 2 - gridW) / 2;
  const startY = settings.marginIn + Math.max(0, (paperH - settings.marginIn * 2 - gridH) / 2) * 0; // top-aligned

  for (let p = 0; p < pages.length; p++) {
    if (p > 0) pdf.addPage([paperW, paperH], orientation);
    const cells = pages[p];

    if (caption) {
      pdf.setFontSize(8.5);
      pdf.setTextColor(150);
      pdf.text(
        `${caption}  ·  Page ${p + 1} of ${pages.length}`,
        paperW / 2,
        paperH - Math.max(0.12, settings.marginIn * 0.5),
        { align: "center" }
      );
    }
    for (let idx = 0; idx < cells.length; idx++) {
      const img = images[cells[idx]];
      if (!img) continue;
      const col = idx % columns;
      const row = Math.floor(idx / columns);
      const x = startX + col * (cellIn + gap);
      const y = startY + row * (cellIn + gap);

      const el = await loadImage(img.url);
      const canvas = renderBadge(el, idx, settings, img.offsetX, img.offsetY);
      // JPEG (white corners) keeps the PDF email-friendly small.
      pdf.addImage(canvas.toDataURL("image/jpeg", JPEG_QUALITY), "JPEG", x, y, cellIn, cellIn, undefined, "FAST");

      if (settings.cutGuides) {
        pdf.setDrawColor(0); // black - easy to see when cutting
        pdf.setLineDashPattern([0.04, 0.03], 0);
        pdf.setLineWidth(0.01);
        if (settings.shape === "circle") {
          pdf.circle(x + cellIn / 2, y + cellIn / 2, cellIn / 2, "S");
        } else {
          pdf.rect(x, y, cellIn, cellIn, "S");
        }
        pdf.setLineDashPattern([], 0);
      }
    }
  }

  pdf.save(filename);
}
