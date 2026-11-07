import { describe, expect, it } from "vite-plus/test";
import { Hono } from "hono";
import { decksRouter } from "../src/server/router";
import { manifestDeckSource } from "../src/source/manifest-source";
import type { CompiledDeck } from "../src/deck/model";

const deck = {
  slug: "deck1",
  sourcePath: "decks/deck1/deck.mdx",
  kind: "directory",
  meta: {
    title: "Deck One",
    tags: ["hono"],
    draft: false,
    meta: {},
  },
  slides: [
    {
      index: 0,
      meta: { title: "Intro", layout: "cover", meta: {} },
      html: "<h1>Intro</h1>",
      components: [],
    },
  ],
  assets: [
    {
      sourcePath: "decks/deck1/assets/image.png",
      publicPath: "/decks/deck1/assets/image.png",
      type: "local",
      contentType: "image/png",
      body: new Uint8Array([1, 2, 3]),
    },
  ],
  warnings: [],
} satisfies CompiledDeck;

describe("manifestDeckSource", () => {
  it("lists and loads compiled decks by slug", async () => {
    const source = manifestDeckSource({ decks: [deck] });

    await expect(source.listDecks({} as never)).resolves.toEqual([
      {
        slug: "deck1",
        title: "Deck One",
        description: undefined,
        draft: false,
        sourcePath: "decks/deck1/deck.mdx",
      },
    ]);

    await expect(source.getCompiledDeck({} as never, "deck1")).resolves.toEqual(deck);
    await expect(source.getCompiledDeck({} as never, "missing")).resolves.toBeNull();
  });

  it("serves manifest assets when the deck owns a local asset", async () => {
    const source = manifestDeckSource({ decks: [deck] });
    const response = await source.getAsset?.({} as never, "deck1", "image.png");

    expect(response?.status).toBe(200);
    expect(response?.headers.get("content-type")).toBe("image/png");
    expect(await response?.arrayBuffer()).toEqual(new Uint8Array([1, 2, 3]).buffer);
  });
});

describe("local asset revalidation", () => {
  function appFor(input: CompiledDeck, dev = false) {
    return new Hono().route("/decks", decksRouter({ source: manifestDeckSource({ decks: [input] }), dev }));
  }

  it("revalidates unchanged assets without a body and changes the tag when bytes change", async () => {
    const app = appFor(deck);
    const path = "/decks/deck1/assets/image.png";
    const response = await app.request(path);
    const tag = response.headers.get("etag");
    expect(tag).toMatch(/^"[a-f0-9]{64}"$/);
    expect(response.headers.get("cache-control")).toBe("public, max-age=0, must-revalidate");
    const cached = await app.request(path, { headers: { "if-none-match": "W/" + tag } });
    expect(cached.status).toBe(304);
    expect(await cached.text()).toBe("");
    const updated = appFor({ ...deck, assets: [{ ...deck.assets[0]!, body: new Uint8Array([4, 5, 6]) }] });
    const fresh = await updated.request(path, { headers: { "if-none-match": tag! } });
    expect(fresh.status).toBe(200);
    expect(fresh.headers.get("etag")).not.toBe(tag);
    expect([...new Uint8Array(await fresh.arrayBuffer())]).toEqual([4, 5, 6]);
  });

  it("avoids browser caching during development even when a prior tag matches", async () => {
    const path = "/decks/deck1/assets/image.png";
    const tag = (await appFor(deck).request(path)).headers.get("etag")!;
    const response = await appFor(deck, true).request(path, { headers: { "if-none-match": tag } });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("etag")).toBeNull();
  });

  it("preserves an explicitly selected production cache policy", async () => {
    const response = await appFor({
      ...deck,
      assets: [{ ...deck.assets[0]!, cacheControl: "private, max-age=60" }],
    }).request("/decks/deck1/assets/image.png");
    expect(response.headers.get("cache-control")).toBe("private, max-age=60");
  });
});
