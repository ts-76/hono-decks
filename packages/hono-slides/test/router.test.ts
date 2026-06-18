import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import type { CompiledDeck } from "../src/deck/model";
import { manifestDeckSource } from "../src/source/manifest-source";
import { honoSlidesRouter } from "../src/server/router";

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
  it("serves an index and an iframe viewer wrapper under the mount path", async () => {
    const app = new Hono();
    app.route("/slides", honoSlidesRouter({ source: manifestDeckSource({ decks: [deck] }) }));

    const index = await app.request("/slides");
    expect(index.status).toBe(200);
    expect(await index.text()).toContain("/slides/deck1");

    const response = await app.request("/slides/deck1");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    const html = await response.text();
    expect(html).toContain('data-hono-slides-viewer');
    expect(html).toContain('src="/slides/deck1/render"');
    expect(html).toContain('data-action="previous"');
    expect(html).toContain('data-action="next"');
    expect(html).toContain('data-action="fullscreen"');
    expect(html).not.toContain("/edit");
    expect(html).not.toContain("/agent/chat");
    expect(html).not.toContain("/apply");
  });

  it("serves the compiled deck on a fixed 1920x1080 render route", async () => {
    const app = new Hono();
    app.route("/slides", honoSlidesRouter({ source: manifestDeckSource({ decks: [deck] }) }));

    const response = await app.request("/slides/deck1/render");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    const html = await response.text();
    expect(html).toContain("<h1>Intro</h1>");
    expect(html).toContain("--hono-slides-width:1920px");
    expect(html).toContain("--hono-slides-height:1080px");
    expect(html).toContain('window.addEventListener("message"');
    expect(html).not.toContain('data-hono-slides-controls');
  });

  it("lets callers mount future feature routers without coupling viewer routes to edit code", async () => {
    const app = new Hono();
    const extension = new Hono();
    extension.get("/:slug/edit", (c) => c.text(`edit:${c.req.param("slug")}`));
    app.route(
      "/slides",
      honoSlidesRouter({
        source: manifestDeckSource({ decks: [deck] }),
        extensions: [{ path: "/", router: extension }],
      }),
    );

    const edit = await app.request("/slides/deck1/edit");
    const view = await app.request("/slides/deck1");

    expect(edit.status).toBe(200);
    expect(await edit.text()).toBe("edit:deck1");
    expect(view.status).toBe(200);
    expect(await view.text()).toContain('src="/slides/deck1/render"');
  });

  it("does not expose edit routes by default, even in dev mode", async () => {
    const app = new Hono();
    app.route("/slides", honoSlidesRouter({ source: manifestDeckSource({ decks: [deck] }), dev: true }));

    expect((await app.request("/slides/deck1/edit")).status).toBe(404);
    expect((await app.request("/slides/deck1/edit/events")).status).toBe(404);
    expect((await app.request("/slides/deck1/edit/save", { method: "POST" })).status).toBe(404);
    expect((await app.request("/slides/deck1/edit/agent/chat", { method: "POST" })).status).toBe(404);
    expect((await app.request("/slides/deck1/edit/apply", { method: "POST" })).status).toBe(404);
  });

  it("adds live reload to render pages only when an extension provides a path", async () => {
    const app = new Hono();
    app.route(
      "/decks",
      honoSlidesRouter({
        source: manifestDeckSource({ decks: [deck] }),
        dev: true,
        liveReloadPath: (slug, mountPath) => `${mountPath}/${encodeURIComponent(slug)}/events`,
      }),
    );

    const wrapperHtml = await (await app.request("/decks/deck1")).text();
    const renderHtml = await (await app.request("/decks/deck1/render")).text();

    expect(wrapperHtml).not.toContain("new EventSource");
    expect(renderHtml).toContain("new EventSource");
    expect(renderHtml).toContain('const eventsUrl = "/decks/deck1/events"');
  });

  it("serves local deck assets and returns 404 for missing slugs", async () => {
    const app = new Hono();
    app.route("/decks", honoSlidesRouter({ source: manifestDeckSource({ decks: [deck] }) }));

    const asset = await app.request("/decks/deck1/assets/image.png");
    expect(asset.status).toBe(200);
    expect(asset.headers.get("content-type")).toBe("image/png");

    const missing = await app.request("/decks/missing");
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: "Deck not found", slug: "missing" });
  });

  it("hides draft decks from production index and direct viewing routes", async () => {
    const draftDeck = {
      ...deck,
      slug: "draft",
      meta: { ...deck.meta, title: "Draft Deck", draft: true },
    } satisfies CompiledDeck;
    const app = new Hono();
    app.route("/slides", honoSlidesRouter({ source: manifestDeckSource({ decks: [deck, draftDeck] }) }));

    const index = await app.request("/slides");
    expect(await index.text()).not.toContain("/slides/draft");

    const response = await app.request("/slides/draft");
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Deck not found", slug: "draft" });
  });

  it("shows draft decks in development mode", async () => {
    const draftDeck = {
      ...deck,
      slug: "draft",
      meta: { ...deck.meta, title: "Draft Deck", draft: true },
    } satisfies CompiledDeck;
    const app = new Hono();
    app.route("/slides", honoSlidesRouter({ source: manifestDeckSource({ decks: [draftDeck] }), dev: true }));

    const index = await app.request("/slides");
    expect(await index.text()).toContain("/slides/draft");

    const response = await app.request("/slides/draft");
    expect(response.status).toBe(200);
  });

  it("exports the viewer router from the public module", async () => {
    const mod = await import("../src/mod");

    expect(typeof mod.honoSlidesRouter).toBe("function");
  });
});
