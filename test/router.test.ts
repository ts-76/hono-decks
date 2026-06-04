import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import type { CompiledDeck } from "../src/deck";
import { manifestDeckSource } from "../src/manifest-source";
import { honoSlidesRouter } from "../src/router";

const deck = {
  slug: "deck1",
  sourcePath: "decks/deck1/deck.mdx",
  kind: "directory",
  meta: { title: "Deck One", draft: false, meta: {} },
  slides: [{ index: 0, meta: { title: "Intro", layout: "cover", meta: {} }, html: "<h1>Intro</h1>", components: [] }],
  assets: [
    {
      sourcePath: "decks/deck1/assets/image.png",
      publicPath: "/decks/deck1/assets/image.png",
      type: "local",
      contentType: "image/png",
      body: new Uint8Array([9, 8, 7]),
    },
  ],
  warnings: [],
} satisfies CompiledDeck;

describe("honoSlidesRouter", () => {
  it("serves an index and a compiled deck under the mount path", async () => {
    const app = new Hono();
    app.route("/slides", honoSlidesRouter({ source: manifestDeckSource({ decks: [deck] }), dev: false }));

    const index = await app.request("/slides");
    expect(index.status).toBe(200);
    expect(await index.text()).toContain("/slides/deck1");

    const response = await app.request("/slides/deck1");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(await response.text()).toContain("<h1>Intro</h1>");
  });

  it("serves local deck assets and returns 404 for missing slugs", async () => {
    const app = new Hono();
    app.route("/decks", honoSlidesRouter({ source: manifestDeckSource({ decks: [deck] }), dev: false }));

    const asset = await app.request("/decks/deck1/assets/image.png");
    expect(asset.status).toBe(200);
    expect(asset.headers.get("content-type")).toBe("image/png");

    const missing = await app.request("/decks/missing");
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: "Deck not found", slug: "missing" });
  });

  it("does not expose development routes when dev is false", async () => {
    const app = new Hono();
    app.route("/decks", honoSlidesRouter({ source: manifestDeckSource({ decks: [deck] }), dev: false }));

    expect((await app.request("/decks/deck1/edit")).status).toBe(404);
    expect((await app.request("/decks/deck1/events")).status).toBe(404);
    expect((await app.request("/decks/deck1/save", { method: "POST" })).status).toBe(404);
  });

  it("exports the production router from the public module", async () => {
    const mod = await import("../src/mod");
    expect(typeof mod.honoSlidesRouter).toBe("function");
    expect(typeof mod.manifestDeckSource).toBe("function");
    expect(typeof mod.resolveDeckFiles).toBe("function");
  });
});
