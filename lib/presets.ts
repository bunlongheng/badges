export type Paper = {
  id: string;
  label: string;
  /** width in inches */
  w: number;
  /** height in inches */
  h: number;
};

export const PAPERS: Paper[] = [
  { id: "letter", label: 'Letter (8.5 x 11")', w: 8.5, h: 11 },
  { id: "a4", label: "A4 (210 x 297mm)", w: 8.27, h: 11.69 },
  { id: "legal", label: 'Legal (8.5 x 14")', w: 8.5, h: 14 },
];

export type SizePreset = { label: string; inches: number; cm: number };

const CM_PER_IN = 2.54;
const cmToIn = (cm: number) => cm / CM_PER_IN;

// Badge-press diameters, largest to smallest. Small/Large are the two real press
// sizes; Mini/Micro/Nano are sticker/label tiers tuned to fit ~30 / ~63 / ~88 per
// Letter page (with the column cap lifted for tiny sizes - see lib/layout.ts).
export const SIZE_LARGE_IN = cmToIn(6.9); // 2.717"
export const SIZE_SMALL_IN = cmToIn(4.85); // 1.909"
export const SIZE_MINI_IN = cmToIn(3.94); // 1.551"  -> ~30 per page
export const SIZE_MICRO_IN = cmToIn(2.92); // 1.150" -> ~63 per page
export const SIZE_NANO_IN = cmToIn(2.41); // 0.949"  -> ~88 per page

export const SIZE_PRESETS: SizePreset[] = [
  { label: "Large", inches: SIZE_LARGE_IN, cm: 6.9 },
  { label: "Small", inches: SIZE_SMALL_IN, cm: 4.85 },
  { label: "Mini", inches: SIZE_MINI_IN, cm: 3.94 },
  { label: "Micro", inches: SIZE_MICRO_IN, cm: 2.92 },
  { label: "Nano", inches: SIZE_NANO_IN, cm: 2.41 },
];

export type Shape = "square" | "rounded" | "circle" | "original";
export const SHAPES: { id: Shape; label: string }[] = [
  { id: "square", label: "Square" },
  { id: "circle", label: "Circle" },
  { id: "original", label: "Original" },
];

// Extra Large is a band layout, not a press diameter: it splits the page into
// this many full-width horizontal bands (one image per band, fit by height).
export const XL_BANDS = 3;

export type Fit = "contain" | "cover";
export const FITS: { id: Fit; label: string }[] = [
  { id: "contain", label: "Fit" },
  { id: "cover", label: "Fill" },
];

// Border around each badge: none, solid black, or auto (the photo's primary colour).
export type Border = "none" | "black" | "auto";
export const BORDERS: { id: Border; label: string }[] = [
  { id: "none", label: "None" },
  { id: "black", label: "Black" },
  { id: "auto", label: "Auto" },
];

// Top-level workflow modes. Each applies a preset bundle (see MODE_PRESETS) but
// every individual control can still be tweaked afterwards.
export type Mode = "badges" | "sheet" | "bomb";
export const MODES: { id: Mode; label: string; icon: string }[] = [
  { id: "badges", label: "Badges", icon: "🔵" },
  { id: "sheet", label: "Sheet", icon: "🖼️" },
  { id: "bomb", label: "Bomb", icon: "💣" },
];

export type Settings = {
  /** which preset bundle was last applied (for highlighting the mode) */
  mode: Mode;
  paperId: string;
  sizeIn: number;
  columns: number;
  gapIn: number;
  marginIn: number;
  shape: Shape;
  fit: Fit;
  /** when true, margin is auto-computed to fit the most badges with a safe border */
  marginAuto: boolean;
  /** border around each badge */
  border: Border;
  /** when true, show the photo's name as curved text along the bottom of each badge */
  showNames: boolean;
  /** curved name font size, as a percent of the badge diameter (viewBox units) */
  nameSize: number;
  /** when true, inset the artwork inside each badge so it doesn't hit the cut edge */
  padding: boolean;
  /** padding amount, as a percent of the badge diameter (per side) */
  paddingPct: number;
  repeat: boolean;
  /** Extra Large band layout: 0 = normal square-cell grid; >0 = that many
   *  full-width horizontal bands per page (one image per band, fit by height). */
  bands: number;
  /** Sticker-bomb layout: scatter every image across one page at random
   *  positions/rotations/overlap. Overrides the grid + bands when on. */
  bomb: boolean;
  /** re-roll seed for the scatter (Shuffle button) */
  bombSeed: number;
  /** max rotation jitter, 0-100 */
  bombRotate: number;
  /** position scatter amount, 0-100 */
  bombScatter: number;
  /** overlap / packing density, 0-100 (higher = tighter + more overlap) */
  bombOverlap: number;
  /** PDF only: after each page, add a horizontally-mirrored copy so duplex
   *  printing (flip on long edge) puts the same badge on front and back - for
   *  laminating badges that read correctly on both sides. */
  doubleSided: boolean;
  cutGuides: boolean;
  /** ruler bars + light measurement grid overlay (screen only), toggled together */
  showGrid: boolean;
  rulerUnit: "in" | "cm";
};

export const DEFAULT_SETTINGS: Settings = {
  mode: "sheet",
  paperId: "letter",
  sizeIn: SIZE_LARGE_IN,
  columns: 3, // unused - layout auto-maximizes
  gapIn: 0, // touch, so we fit the most badges per page
  marginIn: 0.25, // unused - margin is always Auto now
  marginAuto: true, // Auto is the only mode: smallest safe border, even gaps
  shape: "original", // keep each image's own shape by default
  fit: "contain", // show the whole logo/crest - tall crests aren't cropped

  border: "none",
  showNames: false,
  nameSize: 8.5,
  padding: false,
  paddingPct: 8,
  repeat: false,
  bands: 0,
  bomb: false,
  bombSeed: 1,
  bombRotate: 55,
  bombScatter: 70, // Spread
  bombOverlap: 30, // Overlap
  doubleSided: false,
  cutGuides: true,
  showGrid: true,
  rulerUnit: "in",
};

// Preset bundle applied when a mode is picked. Only the keys that define the mode
// are set; the rest of the settings are left as-is.
export const MODE_PRESETS: Record<Mode, Partial<Settings>> = {
  // Print badges: circle, fill/crop, auto colour border, no padding, names on (size 4).
  badges: {
    bomb: false,
    bands: 0,
    sizeIn: SIZE_SMALL_IN,
    shape: "circle",
    fit: "cover",
    border: "auto",
    padding: false,
    showNames: true,
    nameSize: 4,
  },
  // Big originals on a sheet: Large, keep each image's own shape, whole logo.
  sheet: {
    bomb: false,
    bands: 0,
    sizeIn: SIZE_LARGE_IN,
    shape: "original",
    fit: "contain",
    border: "none",
    padding: false,
    showNames: false,
  },
  // Sticker bomb: scattered pile of small originals.
  bomb: {
    bomb: true,
    bands: 0,
    sizeIn: SIZE_MICRO_IN,
    shape: "original",
    fit: "contain",
    border: "none",
    padding: false,
    showNames: false,
    bombRotate: 55,
    bombScatter: 70,
    bombOverlap: 30,
  },
};

export function getPaper(id: string): Paper {
  return PAPERS.find((p) => p.id === id) ?? PAPERS[0];
}
