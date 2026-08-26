import { getPaper, SIZE_LARGE_IN, type Settings } from "./presets";

export type SheetLayout = {
  /** columns actually used */
  columns: number;
  /** rows that fit on one page */
  rows: number;
  /** badges per page */
  perPage: number;
  /** cell edge length in inches */
  cellIn: number;
  /** effective page margin in inches (auto-computed or manual) */
  marginIn: number;
  paperW: number;
  paperH: number;
};

/** Smallest printer-safe margin, and the step used when searching for the best fit. */
const SAFE_MIN = 0.13;

/**
 * Auto margin: the most generous margin (>= SAFE_MIN) that still fits the maximum
 * number of badges, so the grid is centered with the largest even safe border.
 */
export function autoSafeMargin(
  paperW: number,
  paperH: number,
  sizeIn: number,
  gapIn: number
): number {
  const cols0 = fitCount(paperW - SAFE_MIN * 2, sizeIn, gapIn);
  const rows0 = fitCount(paperH - SAFE_MIN * 2, sizeIn, gapIn);
  let best = SAFE_MIN;
  for (let m = SAFE_MIN; m <= 0.75; m += 0.01) {
    const c = fitCount(paperW - m * 2, sizeIn, gapIn);
    const r = fitCount(paperH - m * 2, sizeIn, gapIn);
    if (c === cols0 && r === rows0) best = m;
    else break;
  }
  return Math.round(best * 1000) / 1000;
}

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
  // Auto: use the smallest safe margin so we fit the most badges AND leave the
  // most leftover space, which space-evenly then spreads as equal gaps around
  // every badge (even quadrants) instead of packing them behind a fat border.
  const marginIn = settings.marginAuto ? SAFE_MIN : settings.marginIn;
  const usableW = paper.w - marginIn * 2;
  const usableH = paper.h - marginIn * 2;

  // Cap columns so there's real room to cut: Large maxes at 2 across, others at 3.
  const maxCols = settings.sizeIn >= SIZE_LARGE_IN - 0.01 ? 2 : 3;
  const columns = Math.max(1, Math.min(maxCols, fitCount(usableW, settings.sizeIn, settings.gapIn)));
  const rows = Math.max(1, fitCount(usableH, settings.sizeIn, settings.gapIn));

  return {
    columns,
    rows,
    perPage: columns * rows,
    cellIn: settings.sizeIn,
    marginIn,
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
