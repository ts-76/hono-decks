import { Hono } from "hono";
import { createDeckViewerEmbed, deckContext, type DeckContextVariables } from "@hono/decks";
import type { DecksConfigEnv } from "./decks.config";
import { createDecksRouter, deckMountPath, deckSource } from "./decks";
import {
  renderDeckDetailsPage,
  renderDeckEmbedPage,
  renderHomePage,
} from "./pages";

interface Env extends DecksConfigEnv {
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
  async (c) =>
    c.html(renderDeckEmbedPage({
      meta: c.var.deckMeta,
      viewer: await createDeckViewerEmbed({
        deck: c.var.deck,
        mountPath: deckMountPath,
        controls: false,
      }),
    })),
);
app.route(deckMountPath, createDecksRouter());

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;
