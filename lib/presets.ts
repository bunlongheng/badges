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

// The two real badge-press diameters.
export const SIZE_SMALL_IN = cmToIn(4.85); // 1.909"
export const SIZE_LARGE_IN = cmToIn(6.9); // 2.717"

export const SIZE_PRESETS: SizePreset[] = [
  { label: "Small", inches: SIZE_SMALL_IN, cm: 4.85 },
  { label: "Large", inches: SIZE_LARGE_IN, cm: 6.9 },
];

export type Shape = "square" | "rounded" | "circle";
export const SHAPES: { id: Shape; label: string }[] = [
  { id: "square", label: "Square" },
  { id: "circle", label: "Circle" },
];

export type Fit = "contain" | "cover";
export const FITS: { id: Fit; label: string }[] = [
  { id: "contain", label: "Fit (contain)" },
  { id: "cover", label: "Fill (cover)" },
];

// Border around each badge: none, solid black, or auto (the photo's primary colour).
export type Border = "none" | "black" | "auto";
export const BORDERS: { id: Border; label: string }[] = [
  { id: "none", label: "None" },
  { id: "black", label: "Black" },
  { id: "auto", label: "Auto" },
];

export type Settings = {
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
  cutGuides: boolean;
  /** ruler bars + light measurement grid overlay (screen only), toggled together */
  showGrid: boolean;
  rulerUnit: "in" | "cm";
};

export const DEFAULT_SETTINGS: Settings = {
  paperId: "letter",
  sizeIn: SIZE_LARGE_IN,
  columns: 3, // unused - layout auto-maximizes
  gapIn: 0, // touch, so we fit the most badges per page
  marginIn: 0.25, // unused - margin is always Auto now
  marginAuto: true, // Auto is the only mode: smallest safe border, even gaps
  shape: "circle",
  fit: "contain", // show the whole logo/crest - tall crests aren't cropped

  border: "none",
  showNames: false,
  nameSize: 8.5,
  padding: false,
  paddingPct: 8,
  repeat: false,
  cutGuides: true,
  showGrid: true,
  rulerUnit: "in",
};

export function getPaper(id: string): Paper {
  return PAPERS.find((p) => p.id === id) ?? PAPERS[0];
}
