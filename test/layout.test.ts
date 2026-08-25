import { describe, expect, it } from "vitest";
import { autoSafeMargin, buildPages, computeLayout, fitCount, pageCount } from "@/lib/layout";
import { DEFAULT_SETTINGS, getPaper, type Settings } from "@/lib/presets";

describe("fitCount", () => {
  it("fits whole badges within available space accounting for gaps", () => {
    // 8" available, 2" badges, 0 gap -> 4
    expect(fitCount(8, 2, 0)).toBe(4);
    // gaps reduce the count: 8" available, 2" badges, 0.5" gap
    // 3 badges = 6 + 1.0 = 7 <= 8; 4 badges = 8 + 1.5 = 9.5 > 8 -> 3
    expect(fitCount(8, 2, 0.5)).toBe(3);
  });

  it("returns 0 for non-positive size", () => {
    expect(fitCount(10, 0, 0.1)).toBe(0);
    expect(fitCount(10, -1, 0)).toBe(0);
  });

  it("never returns negative", () => {
    expect(fitCount(1, 5, 0)).toBe(0);
  });
});

describe("computeLayout", () => {
  it("computes a grid that fits the paper and clamps columns", () => {
    const s: Settings = { ...DEFAULT_SETTINGS, sizeIn: 2, columns: 8, gapIn: 0, marginIn: 0.25, marginAuto: false };
    const layout = computeLayout(s);
    const paper = getPaper(s.paperId); // letter 8.5 x 11
    const usableW = paper.w - 0.5; // 8.0
    // max cols that fit = floor(8/2) = 4, so columns clamp from 8 -> 4
    expect(layout.columns).toBe(4);
    expect(layout.rows).toBeGreaterThan(0);
    expect(layout.perPage).toBe(layout.columns * layout.rows);
    expect(usableW).toBe(8);
  });

  it("always maximizes columns to fill the safe zone (ignores the columns setting)", () => {
    // 8" usable / 1" badges with no gap -> 8 columns, regardless of settings.columns
    const s: Settings = { ...DEFAULT_SETTINGS, sizeIn: 1, columns: 3, gapIn: 0, marginIn: 0.25, marginAuto: false };
    expect(computeLayout(s).columns).toBe(8);
  });

  it("always keeps at least one column and row", () => {
    const s: Settings = { ...DEFAULT_SETTINGS, sizeIn: 20, columns: 1, gapIn: 0, marginIn: 0, marginAuto: false };
    const layout = computeLayout(s);
    expect(layout.columns).toBeGreaterThanOrEqual(1);
    expect(layout.rows).toBeGreaterThanOrEqual(1);
  });
});

describe("autoSafeMargin", () => {
  it("maximizes fit with a safe border (Large 6.8cm on Letter fits 3x4)", () => {
    const large = 6.8 / 2.54; // 2.677"
    const m = autoSafeMargin(8.5, 11, large, 0);
    expect(m).toBeGreaterThanOrEqual(0.13); // never below the safe minimum
    const s: Settings = { ...DEFAULT_SETTINGS, sizeIn: large, gapIn: 0, marginAuto: true };
    const layout = computeLayout(s);
    expect(layout.columns).toBe(3);
    expect(layout.rows).toBe(4);
    expect(layout.perPage).toBe(12); // 12, not 9 - the whole point
  });
});

describe("pageCount", () => {
  it("rounds up", () => {
    expect(pageCount(0, 6)).toBe(0);
    expect(pageCount(1, 6)).toBe(1);
    expect(pageCount(6, 6)).toBe(1);
    expect(pageCount(7, 6)).toBe(2);
    expect(pageCount(13, 6)).toBe(3);
  });

  it("guards divide-by-zero", () => {
    expect(pageCount(5, 0)).toBe(0);
  });
});

describe("buildPages", () => {
  it("flows images across pages", () => {
    const pages = buildPages(7, 6, false);
    expect(pages).toHaveLength(2);
    expect(pages[0]).toEqual([0, 1, 2, 3, 4, 5]);
    expect(pages[1]).toEqual([6]);
  });

  it("returns empty when there are no images or no capacity", () => {
    expect(buildPages(0, 6, false)).toEqual([]);
    expect(buildPages(5, 0, false)).toEqual([]);
  });

  it("repeat mode tiles images into a single full page", () => {
    const pages = buildPages(2, 6, true);
    expect(pages).toHaveLength(1);
    expect(pages[0]).toEqual([0, 1, 0, 1, 0, 1]);
  });

  it("repeat mode with one image fills every slot with it", () => {
    expect(buildPages(1, 4, true)).toEqual([[0, 0, 0, 0]]);
  });
});
