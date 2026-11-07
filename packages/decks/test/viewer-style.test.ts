import { describe, expect, it } from "vite-plus/test";
import { baseViewerStyle, embeddedViewerStyle } from "../src/server/viewer-style";

describe.each([
  ["standalone", baseViewerStyle],
  ["embedded", embeddedViewerStyle],
] as const)("%s touch navigation", (_name, renderStyle) => {
  it("is transparent at rest while retaining visible interaction feedback and touch targets", () => {
    const style = renderStyle();
    const restingRule = style.match(/\.hono-decks-mobile-navigation\)\{position:absolute[^}]+\}/)?.[0];
    expect(restingRule).toBeDefined();
    expect(restingRule).toContain("background:transparent;color:transparent");
    expect(restingRule).toContain("width:clamp(2.25rem,6%,2.75rem)");
    expect(restingRule).toContain("top:25%;bottom:25%");
    expect(style).toContain(".hono-decks-mobile-navigation){display:inline-flex;pointer-events:auto}");
    expect(style).toContain(
      ".hono-decks-mobile-navigation:focus-visible){background:rgba(15,23,42,.28);color:#eef2ff;outline:2px solid currentColor",
    );
    expect(style).toContain(".hono-decks-mobile-navigation:active){background:rgba(15,23,42,.28);color:#eef2ff}");
    expect(style).toContain("@media (hover:hover)");
    expect(style).toContain(".hono-decks-mobile-navigation:hover){background:rgba(15,23,42,.28);color:#eef2ff}");
  });
});
