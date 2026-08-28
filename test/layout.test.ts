import { describe, expect, it } from "vitest";
import { autoSafeMargin, buildPages, computeLayout, fitCount, pageCount } from "@/lib/layout";
import { DEFAULT_SETTINGS, getPaper, SIZE_LARGE_IN, SIZE_SMALL_IN, SIZE_NANO_IN, type Settings } from "@/lib/presets";

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
  it("caps columns at 3 even when more would fit", () => {
    const s: Settings = { ...DEFAULT_SETTINGS, sizeIn: 2, columns: 8, gapIn: 0, marginIn: 0.25, marginAuto: false };
    const layout = computeLayout(s);
    // 4 would fit (8/2) but we cap at 3
    expect(layout.columns).toBe(3);
    expect(layout.rows).toBeGreaterThan(0);
    expect(layout.perPage).toBe(layout.columns * layout.rows);
  });

  it("caps columns at 3 for Small badges (never 4+ across)", () => {
    // 4 would fit at Small but the cap holds it to 3
    const s: Settings = { ...DEFAULT_SETTINGS, sizeIn: SIZE_SMALL_IN, gapIn: 0, marginAuto: true };
    expect(computeLayout(s).columns).toBe(3);
  });

  it("lets tiny sizes pack densely (Nano fits far more than 3 columns / page)", () => {
    const s: Settings = { ...DEFAULT_SETTINGS, sizeIn: SIZE_NANO_IN, gapIn: 0, marginAuto: true };
    const layout = computeLayout(s);
    expect(layout.columns).toBeGreaterThan(3);
    expect(layout.perPage).toBeGreaterThanOrEqual(60);
  });

  it("caps Large badges at 2 columns so there's room to cut", () => {
    const s: Settings = { ...DEFAULT_SETTINGS, sizeIn: SIZE_LARGE_IN, gapIn: 0, marginAuto: true };
    expect(computeLayout(s).columns).toBe(2);
  });

  it("always keeps at least one column and row", () => {
    const s: Settings = { ...DEFAULT_SETTINGS, sizeIn: 20, columns: 1, gapIn: 0, marginIn: 0, marginAuto: false };
    const layout = computeLayout(s);
    expect(layout.columns).toBeGreaterThanOrEqual(1);
    expect(layout.rows).toBeGreaterThanOrEqual(1);
  });
});

describe("autoSafeMargin", () => {
  it("maximizes fit with a safe border (a 2.68in badge on Letter fits 3x4)", () => {
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
