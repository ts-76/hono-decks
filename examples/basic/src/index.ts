import { Hono } from "hono";
import { languageDetector, type LanguageVariables } from "hono/language";
import type { DeckContextVariables } from "hono-decks";
import type { DecksConfigEnv } from "../hono-decks.config";
import { decks } from "./decks";
import { getLocale } from "./i18n";
import { renderDeckDetailsPage, renderDeckIndexHead, renderDeckIndexPage, renderHomePage } from "./pages";

interface Env extends DecksConfigEnv {
  Variables: DeckContextVariables & LanguageVariables;
}

const app = new Hono<Env>();
const robotsPolicy = "noindex, nofollow, noarchive";
const robotsText = "User-agent: *\nDisallow: /\n";

app.use(
  "*",
  languageDetector({
    order: ["querystring", "cookie", "header"],
    lookupQueryString: "lang",
    lookupCookie: "language",
    caches: ["cookie"],
    cookieOptions: {
      path: "/",
      sameSite: "Lax",
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365,
    },
    supportedLanguages: ["ja", "en"],
    fallbackLanguage: "en",
  }),
);
app.use("*", async (c, next) => {
  await next();
  c.header("X-Robots-Tag", robotsPolicy);
});
app.get("/robots.txt", (c) => c.text(robotsText));
app.get("/", async (c) => c.html(renderHomePage(await decks.source.listDecks(c), getLocale(c))));
app.get(`${decks.mountPath}/:slug/about`, decks.context(), (c) =>
  c.html(
    renderDeckDetailsPage({
      deck: c.var.deck,
      meta: c.var.deckMeta,
      toc: c.var.deckToc,
      locale: getLocale(c),
    }),
  ),
);
app.route(
  decks.mountPath,
  decks.router({
    document: {
      lang: ({ c }) => getLocale(c),
      surfaces: {
        index: {
          head: ({ c }) => renderDeckIndexHead(getLocale(c)),
        },
      },
    },
    pages: {
      index: {
        title: ({ c }) => (getLocale(c) === "ja" ? "デッキ一覧 — Hono Decks Basic" : "Deck Lab — Hono Decks Basic"),
        async render(input) {
          const compiledDecks = (
            await Promise.all(input.decks.map((entry) => decks.source.getCompiledDeck(input.c, entry.slug)))
          ).filter((deck): deck is NonNullable<typeof deck> => deck !== null);
          return renderDeckIndexPage({
            decks: compiledDecks,
            paths: (slug) => decks.paths(slug),
            locale: getLocale(input.c),
          });
        },
      },
    },
  }),
);

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;
