import type { CompiledDeck } from "../../src/deck/model";

/** Minimal compiled deck shared by the router test suites. */
export const deck = {
  slug: "deck1",
  sourcePath: "decks/deck1/deck.mdx",
  kind: "directory",
  meta: { title: "Deck One", draft: false, meta: {} },
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
      body: new Uint8Array([9, 8, 7]),
    },
  ],
  warnings: [],
} satisfies CompiledDeck;
