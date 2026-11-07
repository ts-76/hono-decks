import { Hono } from "hono";
import { describe, expect, it } from "vite-plus/test";
import type { CompiledDeck } from "../src/deck/model";
import { manifestDeckSource } from "../src/source/manifest-source";
import { decksRouter } from "../src/server/router";
import { baseViewerStyle, embeddedViewerStyle } from "../src/server/viewer-style";
import { deck } from "./support/router-fixtures";

const fourSlides = {
  ...deck,
  slides: Array.from({ length: 4 }, (_, index) => ({ index, meta: { meta: {} }, html: `<p>${index}</p>` })),
} satisfies CompiledDeck;

describe("viewer slide progress", () => {
  it("renders an accessible progress bar sized from the deck", async () => {
    const app = new Hono();
    app.route("/slides", decksRouter({ source: manifestDeckSource({ decks: [fourSlides] }) }));
    const html = await (await app.request("/slides/deck1")).text();
    const element = html.match(/<div[^>]*data-hono-decks-position[^>]*>.*?<\/div>/s)?.[0] ?? "";

    expect(element).toContain('role="progressbar"');
    expect(element).toContain('aria-label="Slide progress"');
    expect(element).toContain('aria-valuemin="1"');
    expect(element).toContain('aria-valuemax="4"');
    expect(element).toContain('aria-valuetext="Slide 1 of 4"');
    expect(element).toContain('<span class="hono-decks-progress-bar" aria-hidden="true"></span>');
    expect(element).toContain('<span class="hono-decks-progress-text">1 / 4</span>');
    expect(element).not.toContain("style=");
  });

  it("updates the bar, ARIA values, and hidden text from presentation state", async () => {
    const app = new Hono();
    app.route("/slides", decksRouter({ source: manifestDeckSource({ decks: [fourSlides] }) }));
    const html = await (await app.request("/slides/deck1")).text();
    expect(html).toContain('position.style.setProperty("--hono-decks-progress", String(current / total))');
    expect(html).toContain('position.setAttribute("aria-valuetext", "Slide " + current + " of " + total)');
    expect(html).toContain("writeProgress(message.index, message.slideCount)");
  });

  it.each([
    ["standalone", baseViewerStyle],
    ["embedded", embeddedViewerStyle],
  ] as const)("draws the %s bar along the bottom edge with overridable colors", (_name, style) => {
    const css = style();
    expect(css).toMatch(
      /\.hono-decks-viewport>\[data-hono-decks-position\]\)\{position:absolute;left:0;right:0;bottom:0;[^}]*height:4px/,
    );
    expect(css).toContain("background:var(--hono-decks-viewer-progress-track,rgba(15,23,42,.22))");
    expect(css).toContain(
      "background:var(--hono-decks-viewer-progress-color,#3b82f6);transform:scaleX(var(--hono-decks-progress,0))",
    );
    expect(css).toMatch(/\.hono-decks-progress-text\)\{position:absolute;width:1px;height:1px/);
  });
});
