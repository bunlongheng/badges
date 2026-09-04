import { describe, expect, it } from "vitest";
import { badgeXPx, computeLayout } from "@/lib/layout";
import { DEFAULT_SETTINGS, PAPERS, SIZE_PRESETS, type Settings } from "@/lib/presets";

/** The PDF renders the double-sided pages at this DPI (see lib/pdf.ts). */
const DPI = 240;

/**
 * Front/back badge positions for one page, in device pixels. Mirrors the loop in
 * drawPageToCanvas: badges spread evenly, a page holding less than one full row
 * packs top-left with no gaps.
 */
function pagePositions(settings: Settings, cells: number) {
  const layout = computeLayout(settings);
  const { paperW, columns, cellW } = layout;
  const usableW = paperW - layout.marginIn * 2;
  const partial = cells < columns;
  const gapX = partial ? 0 : Math.max(0, (usableW - columns * cellW) / (columns + 1));
  return Array.from({ length: Math.min(cells, columns) }, (_, col) => {
    const x = layout.marginIn + gapX * (col + 1) + cellW * col;
    return {
      col,
      front: badgeXPx(x, cellW, paperW, DPI, false),
      back: badgeXPx(x, cellW, paperW, DPI, true),
      widthPx: Math.round(cellW * DPI),
      pageWidthPx: Math.round(paperW * DPI),
    };
  });
}

describe("double-sided badge alignment", () => {
  // Duplex (flip on long edge) puts the back page behind the front mirrored about
  // the page centre, so the back badge has to be the front badge's exact mirror.
  // 1px at 240 DPI is 0.106mm - small, but it is a visible edge once laminated.
  it("mirrors every badge exactly, for every paper x size x column", () => {
    const offenders: string[] = [];
    for (const paper of PAPERS) {
      for (const size of SIZE_PRESETS) {
        const settings: Settings = { ...DEFAULT_SETTINGS, paperId: paper.id, sizeIn: size.inches, bands: 0 };
        const { columns, perPage } = computeLayout(settings);
        // a full page, and every partial page down to a single badge
        for (const cells of [perPage, ...Array.from({ length: columns }, (_, i) => i + 1)]) {
          for (const p of pagePositions(settings, cells)) {
            const mirroredBack = p.pageWidthPx - (p.back + p.widthPx);
            if (mirroredBack !== p.front) {
              offenders.push(`${paper.id}/${size.label} cells=${cells} col=${p.col}: ${mirroredBack - p.front}px`);
            }
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("keeps the badge width identical on both sides", () => {
    for (const paper of PAPERS) {
      for (const size of SIZE_PRESETS) {
        const settings: Settings = { ...DEFAULT_SETTINGS, paperId: paper.id, sizeIn: size.inches, bands: 0 };
        const [first] = pagePositions(settings, computeLayout(settings).perPage);
        expect(first.widthPx).toBe(Math.round(size.inches * DPI));
      }
    }
  });

  // Regressions from the inch-space mirror: these three rounded 1px off.
  it.each([
    ["letter", "Nano", 88],
    ["a4", "Small", 15],
    ["letter", "Mini", 3],
  ])("%s + %s with %i badges lands on zero offset", (paperId, sizeLabel, cells) => {
    const size = SIZE_PRESETS.find((s) => s.label === sizeLabel)!;
    const settings: Settings = { ...DEFAULT_SETTINGS, paperId, sizeIn: size.inches, bands: 0 };
    for (const p of pagePositions(settings, cells)) {
      expect(p.pageWidthPx - (p.back + p.widthPx)).toBe(p.front);
    }
  });
});
