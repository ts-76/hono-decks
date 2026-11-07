import { Hono } from "hono";
import { describe, expect, it } from "vite-plus/test";
import type { CompiledDeck } from "../src/deck/model";
import { configureDecks } from "../src/server/define-decks";
import { manifestDeckSource } from "../src/source/manifest-source";
import { decksRouter } from "../src/server/router";
import { deck } from "./support/router-fixtures";

const threeSlides = {
  ...deck,
  themeStyle: ".deck-theme-marker{color:teal}",
  slides: [
    { index: 0, meta: { title: "Intro", layout: "cover", meta: {} }, html: "<h1>Intro</h1>", notes: "Secret note" },
    { index: 1, meta: { title: "Agenda <&>", layout: "default", meta: {} }, html: "<h2>Agenda</h2>" },
    { index: 2, meta: { layout: "default", meta: {} }, html: "<p>Untitled</p>" },
  ],
} satisfies CompiledDeck;

function appFor(options: Partial<Parameters<typeof decksRouter>[0]> = {}) {
  const app = new Hono();
  app.route("/slides", decksRouter({ source: manifestDeckSource({ decks: [threeSlides] }), ...options }));
  return app;
}

describe("deck overview page", () => {
  it("renders every slide as a linked thumbnail in a grid", async () => {
    const response = await appFor().request("/slides/deck1/overview");
    expect(response.status).toBe(200);
    const html = await response.text();

    expect(html).toContain("<title>Deck One - Overview</title>");
    expect(html).toContain("data-hono-decks-overview-grid");
    expect(html.match(/class="hono-decks-overview-card"/g)).toHaveLength(3);
    expect(html).toContain('href="/slides/deck1?slide=1"');
    expect(html).toContain('href="/slides/deck1?slide=3"');
    expect(html).toContain("<h1>Intro</h1>");
    expect(html).toContain('<span class="hono-decks-overview-label">Agenda &lt;&amp;&gt;</span>');
    expect(html).toContain('<span class="hono-decks-overview-label">Slide 3</span>');
    expect(html).toContain(".deck-theme-marker{color:teal}");
    expect(html).toContain('aria-hidden="true" inert');
    expect(html).toContain('href="/slides/deck1"');
    expect(html).toContain("3 slides");
    expect(html).not.toContain("Secret note");
    expect(html).not.toContain(`aria-current="true"`);
  });

  it("highlights the viewer's current slide", async () => {
    const html = await (await appFor().request("/slides/deck1/overview?slide=2")).text();
    expect(html).toContain('href="/slides/deck1?slide=2" data-slide-number="2" aria-current="true"');
    expect(html.match(/aria-current="true"/g)).toHaveLength(1);
  });

  it("can be disabled per request and links from the viewer only when available", async () => {
    const enabled = await (await appFor().request("/slides/deck1")).text();
    expect(enabled).toContain('href="/slides/deck1/overview"');
    expect(enabled).toMatch(/<a[^>]*href="\/slides\/deck1\/overview"[^>]*data-hono-decks-overview-link/);
    expect(enabled).toContain('aria-label="Slide overview"');

    const disabled = appFor({ pages: { overview: false } });
    expect((await disabled.request("/slides/deck1/overview")).status).toBe(404);
    expect(await (await disabled.request("/slides/deck1")).text()).not.toContain('href="/slides/deck1/overview"');

    const hidden = await (
      await appFor({ viewer: { controls: { hidden: ["overview"] } } }).request("/slides/deck1")
    ).text();
    expect(hidden).not.toContain('href="/slides/deck1/overview"');
  });

  it("hides drafts in production and exposes the path in the configured API", async () => {
    const draft = { ...threeSlides, meta: { ...threeSlides.meta, draft: true } };
    const app = new Hono();
    app.route("/slides", decksRouter({ source: manifestDeckSource({ decks: [draft] }), dev: false }));
    expect((await app.request("/slides/deck1/overview")).status).toBe(404);

    const configured = configureDecks({ mountPath: "/talks", decks: [threeSlides] });
    expect(configured.paths("deck1").overview).toBe("/talks/deck1/overview");
  });
});
