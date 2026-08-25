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

export type SizePreset = { label: string; inches: number; cm: number; detail: string };

const CM_PER_IN = 2.54;
const cmToIn = (cm: number) => cm / CM_PER_IN;

// The two real badge-press diameters.
export const SIZE_SMALL_IN = cmToIn(4.75); // 1.870"
export const SIZE_LARGE_IN = cmToIn(6.8); // 2.677"

export const SIZE_PRESETS: SizePreset[] = [
  { label: "Small", inches: SIZE_SMALL_IN, cm: 4.75, detail: '4.75 cm · 1.87" diameter' },
  { label: "Large", inches: SIZE_LARGE_IN, cm: 6.8, detail: '6.8 cm · 2.68" diameter' },
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

export type BadgeStyle = "plain" | "kids" | "neon";
export const BADGE_STYLES: { id: BadgeStyle; label: string }[] = [
  { id: "plain", label: "Plain" },
  { id: "kids", label: "Kids" },
  { id: "neon", label: "Neon" },
];

export type Settings = {
  paperId: string;
  sizeIn: number;
  columns: number;
  gapIn: number;
  marginIn: number;
  shape: Shape;
  fit: Fit;
  style: BadgeStyle;
  repeat: boolean;
  cutGuides: boolean;
  ruler: boolean;
  rulerUnit: "in" | "cm";
};

export const DEFAULT_SETTINGS: Settings = {
  paperId: "letter",
  sizeIn: SIZE_LARGE_IN,
  columns: 3, // unused - layout auto-maximizes
  gapIn: 0, // touch, so we fit the most badges per page
  marginIn: 0.25, // print-safe margin
  shape: "circle",
  fit: "cover",
  style: "plain",
  repeat: false,
  cutGuides: true,
  ruler: true,
  rulerUnit: "in",
};

export function getPaper(id: string): Paper {
  return PAPERS.find((p) => p.id === id) ?? PAPERS[0];
}
