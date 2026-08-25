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

export type SizePreset = { label: string; inches: number };

export const SIZE_PRESETS: SizePreset[] = [
  { label: '1"', inches: 1 },
  { label: '1.5"', inches: 1.5 },
  { label: '2"', inches: 2 },
  { label: '2.125" (button)', inches: 2.125 },
  { label: '2.5"', inches: 2.5 },
  { label: '3"', inches: 3 },
];

export type Shape = "square" | "rounded" | "circle";
export const SHAPES: { id: Shape; label: string }[] = [
  { id: "square", label: "Square" },
  { id: "rounded", label: "Rounded" },
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
};

export const DEFAULT_SETTINGS: Settings = {
  paperId: "letter",
  sizeIn: 3,
  columns: 2,
  gapIn: 0.15,
  marginIn: 0.25,
  shape: "rounded",
  fit: "contain",
  style: "plain",
  repeat: false,
  cutGuides: false,
};

export function getPaper(id: string): Paper {
  return PAPERS.find((p) => p.id === id) ?? PAPERS[0];
}
