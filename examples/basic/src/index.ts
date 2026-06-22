import { Hono } from "hono";
import { deckContext, type DeckBrowserRunBinding, type DeckContextVariables } from "@hono/decks";
import type { DecksConfigBindings } from "./decks.config";
import { createDecksRouter, deckSource } from "./decks";
import {
  renderDeckDetailsPage,
  renderDeckEmbedPage,
  renderHomePage,
  renderSampleViewerHead,
} from "./pages";

interface Env {
  Bindings: DecksConfigBindings & {
    BROWSER?: DeckBrowserRunBinding;
  };
  Variables: DeckContextVariables;
}

const app = new Hono<Env>();

app.get("/", async (c) => c.html(renderHomePage(await deckSource.listDecks(c))));
app.get(
  "/decks/:slug/about",
  deckContext({ source: deckSource, mountPath: "/decks" }),
  (c) =>
    c.html(renderDeckDetailsPage({
      deck: c.var.deck,
      meta: c.var.deckMeta,
      toc: c.var.deckToc,
    })),
);
app.get("/decks/:slug/embed", deckContext({ source: deckSource, mountPath: "/decks", viewer: { controls: false } }), (c) =>
  c.html(renderDeckEmbedPage({
    meta: c.var.deckMeta,
    viewer: c.var.deckViewer,
  })),
);
app.route(
  "/decks",
  createDecksRouter({
    viewer: {
      head: renderSampleViewerHead(),
    },
    export: {
      browser: (c) => c.env.BROWSER,
      pdf: true,
      png: true,
    },
  }),
);

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;
