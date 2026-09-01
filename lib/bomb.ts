import type { Settings } from "./presets";
import type { SheetLayout } from "./layout";

/** One scattered sticker: centre point (inches), rotation (deg), scale factor. */
export type Sticker = { cx: number; cy: number; angle: number; scale: number };

/** Deterministic PRNG (mulberry32) so preview and export scatter identically. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Sticker-bomb placement: lay the stickers on a jittered grid that tightens with
 * the Overlap slider, then randomise each one's offset, rotation and size from the
 * seed. Fully deterministic for a given (seed, count, settings) so what you see is
 * what prints. Later stickers draw on top (natural overlap).
 */
export function stickerPlacements(
  count: number,
  settings: Settings,
  layout: SheetLayout
): Sticker[] {
  const { paperW, paperH, marginIn } = layout;
  const s = settings.sizeIn; // base sticker size (inches)
  const overlap = clamp01(settings.bombOverlap / 100);
  const scatter = clamp01(settings.bombScatter / 100);
  const rotMax = clamp01(settings.bombRotate / 100) * 55; // max +/- degrees
  const usableW = paperW - marginIn * 2;
  const usableH = paperH - marginIn * 2;

  // Grid step shrinks as overlap rises, so stickers pack tighter and overlap more.
  const step = Math.max(0.22, s * (1 - overlap * 0.58));
  const cols = Math.max(1, Math.ceil(usableW / step));
  const rows = Math.max(1, Math.ceil(usableH / step));
  const gridW = cols * step;
  const gridH = rows * step;
  const ox = marginIn + (usableW - gridW) / 2 + step / 2;
  const oy = marginIn + (usableH - gridH) / 2 + step / 2;

  const slots: { cx: number; cy: number }[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) slots.push({ cx: ox + c * step, cy: oy + r * step });

  const rand = rng(((settings.bombSeed || 1) * 2654435761) >>> 0);
  // Shuffle slots so a short image list still spreads across the whole sheet.
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }

  const out: Sticker[] = [];
  for (let i = 0; i < count; i++) {
    const slot = slots[i % slots.length];
    const jx = (rand() - 0.5) * scatter * step * 1.25;
    const jy = (rand() - 0.5) * scatter * step * 1.25;
    const angle = (rand() - 0.5) * 2 * rotMax;
    const scale = 0.82 + rand() * 0.42; // organic size variation
    out.push({ cx: slot.cx + jx, cy: slot.cy + jy, angle, scale });
  }
  return out;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
