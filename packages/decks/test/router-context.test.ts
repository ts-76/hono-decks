import { Hono } from "hono";
import { describe, expect, it } from "vite-plus/test";
import { manifestDeckSource } from "../src/source/manifest-source";
import { deckContext, decksRouter } from "../src/server/router";
import type { DeckContextVariables } from "../src/server/router";
import type { CompiledDeck } from "../src/deck/model";
import { deck } from "./support/router-fixtures";

describe("deckContext for application routes", () => {
  it("provides deck-aware context variables for custom routes", async () => {
    const app = new Hono<{ Variables: DeckContextVariables }>();
    app.get("/slides/:slug/embed", deckContext({ source: manifestDeckSource({ decks: [deck] }) }), (c) => {
      return c.html(
        `<article data-context-deck="${c.var.deck.slug}" data-render-url="${c.var.deckViewer.renderUrl}" data-toc-count="${c.var.deckToc.length}">${c.var.deckViewer.frame.html}<p>${c.var.deckMeta.title}</p></article>`,
      );
    });

    const response = await app.request("/slides/deck1/embed");
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('data-context-deck="deck1"');
    expect(html).toContain('data-render-url="/slides/deck1/render"');
    expect(html).toContain('data-toc-count="1"');
    expect(html).toContain("data-hono-decks-frame");
    expect(html).toContain("Deck One");
  });

  it("lets deckContext target a public mount path from custom admin routes", async () => {
    const app = new Hono<{ Variables: DeckContextVariables }>();
    app.get(
      "/admin/decks/:slug",
      deckContext({ source: manifestDeckSource({ decks: [deck] }), mountPath: "/decks" }),
      (c) =>
        c.json({
          renderUrl: c.var.deckViewer.renderUrl,
          canonicalPath: c.var.deckMeta.paths.viewer,
          printPath: c.var.deckMeta.paths.print,
        }),
    );

    const response = await app.request("/admin/decks/deck1");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      renderUrl: "/decks/deck1/render",
      canonicalPath: "/decks/deck1",
      printPath: "/decks/deck1/print",
    });
  });

  it("applies draft filtering in deckContext routes", async () => {
    const draftDeck = {
      ...deck,
      slug: "draft",
      meta: { ...deck.meta, title: "Draft Deck", draft: true },
    } satisfies CompiledDeck;
    const source = manifestDeckSource({ decks: [draftDeck] });
    const app = new Hono<{ Variables: DeckContextVariables }>();
    app.get("/slides/:slug/embed", deckContext({ source }), (c) => c.text(c.var.deck.slug));
    app.get("/dev/:slug/embed", deckContext({ source, dev: true, mountPath: "/dev" }), (c) => c.text(c.var.deck.slug));

    const production = await app.request("/slides/draft/embed");
    const dev = await app.request("/dev/draft/embed");

    expect(production.status).toBe(404);
    expect(await production.text()).toBe("404 Not Found");
    expect(dev.status).toBe(200);
    expect(await dev.text()).toBe("draft");
  });

  it("hides draft decks from production index and direct viewing routes", async () => {
    const draftDeck = {
      ...deck,
      slug: "draft",
      meta: { ...deck.meta, title: "Draft Deck", draft: true },
    } satisfies CompiledDeck;
    const app = new Hono();
    app.route("/slides", decksRouter({ source: manifestDeckSource({ decks: [deck, draftDeck] }) }));

    const index = await app.request("/slides");
    expect(await index.text()).not.toContain("/slides/draft");

    const response = await app.request("/slides/draft");
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("404 Not Found");
  });

  it("shows draft decks in development mode", async () => {
    const draftDeck = {
      ...deck,
      slug: "draft",
      meta: { ...deck.meta, title: "Draft Deck", draft: true },
    } satisfies CompiledDeck;
    const app = new Hono();
    app.route("/slides", decksRouter({ source: manifestDeckSource({ decks: [draftDeck] }), dev: true }));

    const index = await app.request("/slides");
    expect(await index.text()).toContain("/slides/draft");

    const response = await app.request("/slides/draft");
    expect(response.status).toBe(200);
  });
});
