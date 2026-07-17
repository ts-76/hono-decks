import { Hono } from "hono";
import type { DeckContextVariables } from "hono-decks";
import type { DecksConfigEnv } from "../hono-decks.config";
import { decks } from "./decks";
import { renderDeckDetailsPage, renderDeckIndexHead, renderDeckIndexPage, renderHomePage } from "./pages";

interface Env extends DecksConfigEnv {
  Variables: DeckContextVariables;
}

const app = new Hono<Env>();
const robotsPolicy = "noindex, nofollow, noarchive";
const robotsText = "User-agent: *\nDisallow: /\n";

app.use("*", async (c, next) => {
  await next();
  c.header("X-Robots-Tag", robotsPolicy);
});
app.get("/robots.txt", (c) => c.text(robotsText));
app.get("/", async (c) => c.html(renderHomePage(await decks.source.listDecks(c))));
app.get(`${decks.mountPath}/:slug/about`, decks.context(), (c) =>
  c.html(
    renderDeckDetailsPage({
      deck: c.var.deck,
      meta: c.var.deckMeta,
      toc: c.var.deckToc,
    }),
  ),
);
app.route(
  decks.mountPath,
  decks.router({
    document: {
      surfaces: {
        index: {
          lang: "en",
          head: renderDeckIndexHead(),
        },
      },
    },
    pages: {
      index: {
        title: "Deck Lab — Hono Decks Basic",
        async render(input) {
          const compiledDecks = (
            await Promise.all(input.decks.map((entry) => decks.source.getCompiledDeck(input.c, entry.slug)))
          ).filter((deck) => deck !== null);
          return renderDeckIndexPage({
            decks: compiledDecks,
            paths: (slug) => decks.paths(slug),
          });
        },
      },
    },
  }),
);

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;
