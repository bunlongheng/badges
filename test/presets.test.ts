import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, PAPERS, SIZE_PRESETS, getPaper } from "@/lib/presets";

describe("presets", () => {
  it("getPaper returns the matching paper", () => {
    expect(getPaper("a4").w).toBeCloseTo(8.27);
    expect(getPaper("letter").id).toBe("letter");
  });

  it("getPaper falls back to the first paper for unknown ids", () => {
    expect(getPaper("nope")).toEqual(PAPERS[0]);
  });

  it("default settings reference a real paper and a preset size", () => {
    expect(PAPERS.some((p) => p.id === DEFAULT_SETTINGS.paperId)).toBe(true);
    expect(SIZE_PRESETS.some((s) => s.inches === DEFAULT_SETTINGS.sizeIn)).toBe(true);
  });

  it("has exactly two badge sizes: the real 4.75cm and 6.8cm diameters", () => {
    expect(SIZE_PRESETS).toHaveLength(2);
    expect(SIZE_PRESETS.map((s) => s.cm)).toEqual([4.75, 6.8]);
  });
});
