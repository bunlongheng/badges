import { getPaper, type Settings } from "./presets";

export type SheetLayout = {
  /** columns actually used */
  columns: number;
  /** rows that fit on one page */
  rows: number;
  /** badges per page */
  perPage: number;
  /** cell edge length in inches */
  cellIn: number;
  paperW: number;
  paperH: number;
};

/**
 * How many badges of `size` (+ gap) fit within `available` inches.
 * n badges occupy: n*size + (n-1)*gap  <=  available
 */
export function fitCount(available: number, size: number, gap: number): number {
  if (size <= 0) return 0;
  const n = Math.floor((available + gap) / (size + gap));
  return Math.max(0, n);
}

/**
 * Compute the grid for one page given the settings.
 * Columns are clamped to what physically fits the paper width.
 */
export function computeLayout(settings: Settings): SheetLayout {
  const paper = getPaper(settings.paperId);
  const usableW = paper.w - settings.marginIn * 2;
  const usableH = paper.h - settings.marginIn * 2;

  // Always maximize: fit as many badges as physically possible in the safe zone.
  const columns = Math.max(1, fitCount(usableW, settings.sizeIn, settings.gapIn));
  const rows = Math.max(1, fitCount(usableH, settings.sizeIn, settings.gapIn));

  return {
    columns,
    rows,
    perPage: columns * rows,
    cellIn: settings.sizeIn,
    paperW: paper.w,
    paperH: paper.h,
  };
}

/** Number of pages needed for `count` badges at `perPage`. */
export function pageCount(count: number, perPage: number): number {
  if (perPage <= 0) return 0;
  if (count <= 0) return 0;
  return Math.ceil(count / perPage);
}

/**
 * Build the per-page list of image indices to render.
 * With `repeat`, a non-empty image list is tiled to fill every page slot,
 * producing exactly one full page (handy for printing copies of a few badges).
 * Without `repeat`, images flow across as many pages as needed.
 */
export function buildPages(
  imageCount: number,
  perPage: number,
  repeat: boolean
): number[][] {
  if (perPage <= 0 || imageCount <= 0) return [];

  if (repeat) {
    const page: number[] = [];
    for (let slot = 0; slot < perPage; slot++) {
      page.push(slot % imageCount);
    }
    return [page];
  }

  const pages: number[][] = [];
  const total = pageCount(imageCount, perPage);
  for (let p = 0; p < total; p++) {
    const page: number[] = [];
    for (let s = 0; s < perPage; s++) {
      const idx = p * perPage + s;
      if (idx < imageCount) page.push(idx);
    }
    pages.push(page);
  }
  return pages;
}
