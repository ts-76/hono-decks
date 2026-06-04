import { describe, expect, it } from "vitest";
import { manifestDeckSource } from "../src/manifest-source";
import type { CompiledDeck } from "../src/deck";

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
