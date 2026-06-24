import { Hono } from "hono";
import { deckContext, type DeckContextVariables } from "@hono/decks";
import type { DecksConfigBindings } from "./decks.config";
import { createDecksRouter, deckMountPath, deckSource } from "./decks";
import {
  renderDeckDetailsPage,
  renderDeckEmbedPage,
  renderHomePage,
  renderSampleViewerHead,
} from "./pages";

interface Env {
  Bindings: DecksConfigBindings;
  Variables: DeckContextVariables;
}

const app = new Hono<Env>();

app.get("/", async (c) => c.html(renderHomePage(await deckSource.listDecks(c))));
app.get(
  `${deckMountPath}/:slug/about`,
  deckContext({ source: deckSource, mountPath: deckMountPath }),
  (c) =>
    c.html(renderDeckDetailsPage({
      deck: c.var.deck,
      meta: c.var.deckMeta,
      toc: c.var.deckToc,
    })),
);
app.get(
  `${deckMountPath}/:slug/embed`,
  deckContext({ source: deckSource, mountPath: deckMountPath, viewer: { controls: false } }),
  (c) =>
    c.html(renderDeckEmbedPage({
      meta: c.var.deckMeta,
      viewer: c.var.deckViewer,
    })),
);
app.route(
  deckMountPath,
  createDecksRouter({
    viewer: {
      head: renderSampleViewerHead(),
    },
  }),
);

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;
