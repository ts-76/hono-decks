import { describe, expect, it } from "vite-plus/test";
import { clippedOverflow, overflowEdges, renderOverflowChecker } from "../src/renderer/overflow-checker";

describe("overflow diagnostics", () => {
  it("measures the four edges in unscaled canvas pixels", () => {
    expect(
      overflowEdges(
        { left: 90, top: 95, right: 1110, bottom: 660 },
        { left: 100, top: 100, right: 1060, bottom: 640 },
        0.5,
        0.5,
      ),
    ).toEqual({ left: 20, right: 100, top: 10, bottom: 40 });
  });
  it("ignores rounding and only reports clipped scroll overflow", () => {
    expect(
      overflowEdges({ left: 0, top: 0, right: 100.4, bottom: 100 }, { left: 0, top: 0, right: 100, bottom: 100 }, 1, 1),
    ).toEqual({});
    expect(clippedOverflow(120, 100, "hidden")).toBe(true);
    expect(clippedOverflow(120, 100, "auto")).toBe(false);
    expect(clippedOverflow(101, 100, "clip")).toBe(false);
  });
  it("renders a nonce on both development assets", () => {
    expect(renderOverflowChecker("abc").match(/nonce="abc"/g)).toHaveLength(2);
  });
});
