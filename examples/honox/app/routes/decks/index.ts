import { decks } from "../../decks";
import { renderHonoXDeckIndexHead, renderHonoXDeckIndexPage } from "../../deck-index";
import { getLocale } from "../../i18n";

export default decks.router({
  document: {
    lang: ({ c }) => getLocale(c),
    surfaces: {
      index: {
        head: ({ c }) => renderHonoXDeckIndexHead(getLocale(c)),
      },
    },
  },
  pages: {
    index: {
      title: ({ c }) => (getLocale(c) === "ja" ? "登壇資料一覧 — ts-76 Talks" : "Talk archive — ts-76 Talks"),
      async render(input) {
        const compiledDecks = (
          await Promise.all(input.decks.map((entry) => decks.source.getCompiledDeck(input.c, entry.slug)))
        ).filter((deck): deck is NonNullable<typeof deck> => deck !== null);
        return renderHonoXDeckIndexPage({
          decks: compiledDecks,
          paths: (slug) => decks.paths(slug),
          locale: getLocale(input.c),
        });
      },
    },
  },
});
