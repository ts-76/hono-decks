import { decks } from "../../decks";
import { renderHonoXDeckIndexHead, renderHonoXDeckIndexPage } from "../../deck-index";

export default decks.router({
  document: {
    surfaces: {
      index: {
        lang: "ja",
        head: renderHonoXDeckIndexHead(),
      },
    },
  },
  pages: {
    index: {
      title: "Talk archive — ts-76 Talks",
      async render(input) {
        const compiledDecks = (
          await Promise.all(input.decks.map((entry) => decks.source.getCompiledDeck(input.c, entry.slug)))
        ).filter((deck) => deck !== null);
        return renderHonoXDeckIndexPage({
          decks: compiledDecks,
          paths: (slug) => decks.paths(slug),
        });
      },
    },
  },
});
