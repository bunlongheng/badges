import type { Settings } from "./presets";
import type { SheetLayout } from "./layout";

/** One scattered sticker: centre point (inches), rotation (deg), scale factor. */
export type Sticker = { cx: number; cy: number; angle: number; scale: number };

/** Deterministic PRNG (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a-ish string hash mixed with a seed - used to assign images to slots. */
function hash32(str: string, seed: number): number {
  let h = (seed ^ 0x811c9dc5) >>> 0;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 0x01000193) >>> 0;
  return h >>> 0;
}

const SPIN = 0.7; // fixed spiral rotation so the pile shape is stable across shuffles

/**
 * Sticker-bomb placement. The pile SHAPE (spiral slot positions, per-slot rotation,
 * jitter, size) is a stable function of the SLOT index and the sliders - it does NOT
 * change when you Shuffle. Shuffle (bombSeed) only re-assigns which image lands in
 * which slot (by hashing the image id), so it swaps the contents, not the arrangement.
 *
 * Placements are returned aligned to `ids` (page order). Draw them in that order so
 * the last image sits on top - moving an image to the end brings it to the front,
 * in both the preview and the export.
 */
export function stickerPlacements(
  ids: string[],
  settings: Settings,
  layout: SheetLayout
): Sticker[] {
  const { paperW, paperH, marginIn } = layout;
  const s = settings.sizeIn;
  const overlap = clamp01(settings.bombOverlap / 100);
  const scatter = clamp01(settings.bombScatter / 100);
  const rotMax = clamp01(settings.bombRotate / 100) * 55;
  const usableW = paperW - marginIn * 2;
  const usableH = paperH - marginIn * 2;
  const cx0 = marginIn + usableW / 2;
  const cy0 = marginIn + usableH / 2;
  const n = Math.max(1, ids.length);

  // Assign each image to a slot by hashing its id with the seed. Same seed -> same
  // mapping; Shuffle bumps the seed -> a new mapping (contents swap, shape stays).
  const seed = (settings.bombSeed || 1) >>> 0;
  const ranked = ids.map((id, i) => ({ i, key: hash32(id, seed) }));
  ranked.sort((a, b) => a.key - b.key || a.i - b.i);
  const slotOf = new Array<number>(n);
  ranked.forEach((r, slot) => (slotOf[r.i] = slot));

  // Radius growth: Spread sets reach; Overlap compresses toward the centre.
  const maxR = Math.min(usableW, usableH) * 0.5 * 0.96;
  const spread01 = 0.16 + scatter * 0.84;
  const k = (maxR / Math.sqrt(n)) * spread01 * (1 - overlap * 0.5);
  const golden = Math.PI * (3 - Math.sqrt(5));
  const jitter = s * 0.28 * scatter;

  return ids.map((_, i) => {
    const slot = slotOf[i];
    const sr = rng(((slot + 1) * 0x9e3779b9) >>> 0); // stable per slot
    const r = k * Math.sqrt(slot + 0.5);
    const a = slot * golden + SPIN;
    const jx = (sr() - 0.5) * 2 * jitter;
    const jy = (sr() - 0.5) * 2 * jitter;
    const angle = (sr() - 0.5) * 2 * rotMax;
    const scale = 0.82 + sr() * 0.42;
    return { cx: cx0 + r * Math.cos(a) + jx, cy: cy0 + r * Math.sin(a) + jy, angle, scale };
  });
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
