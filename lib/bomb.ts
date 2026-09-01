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
 * Sticker-bomb placement: pack the stickers in a phyllotaxis (sunflower) spiral
 * growing OUT from the page centre, so they pile up and overlap densely in the
 * middle and fan out as the Spread slider rises. Overlap tightens the stacking,
 * rotation tilts each one. Deterministic per (seed, count, settings); the Shuffle
 * seed re-permutes which sticker sits where and rotates the whole cluster. Later
 * stickers draw on top (natural overlap).
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
  const cx0 = marginIn + usableW / 2;
  const cy0 = marginIn + usableH / 2;
  const n = Math.max(1, count);

  const rand = rng(((settings.bombSeed || 1) * 2654435761) >>> 0);
  // Re-permute spiral slots + spin the whole cluster so Shuffle gives a fresh look.
  const perm = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  const spin = rand() * Math.PI * 2;

  // Radius growth: Spread sets how far the cluster reaches; Overlap compresses it
  // (tighter = more central stacking). At full spread the cluster fills the page.
  const maxR = Math.min(usableW, usableH) * 0.5 * 0.96;
  const spread01 = 0.16 + scatter * 0.84;
  const k = (maxR / Math.sqrt(n)) * spread01 * (1 - overlap * 0.5);
  const golden = Math.PI * (3 - Math.sqrt(5)); // ~137.5 deg
  const jitter = s * 0.28 * scatter;

  const out: Sticker[] = [];
  for (let i = 0; i < count; i++) {
    const slot = perm[i];
    const r = k * Math.sqrt(slot + 0.5);
    const a = slot * golden + spin;
    const jx = (rand() - 0.5) * 2 * jitter;
    const jy = (rand() - 0.5) * 2 * jitter;
    const angle = (rand() - 0.5) * 2 * rotMax;
    const scale = 0.82 + rand() * 0.42; // organic size variation
    out.push({ cx: cx0 + r * Math.cos(a) + jx, cy: cy0 + r * Math.sin(a) + jy, angle, scale });
  }
  return out;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
