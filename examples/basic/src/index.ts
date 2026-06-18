import { Hono } from "hono";
import { deckContext, withR2Assets, type DeckContextVariables, type R2BucketLike } from "@hono/decks";
import { decks, decksRouter } from "./generated/decks";
import { renderDeckDetailsPage, renderDeckEmbedPage, renderHomePage, renderSampleViewerHead } from "./pages";

interface Env {
  Bindings: {
    DECK_ASSETS?: R2BucketLike;
  };
  Variables: DeckContextVariables;
}

const app = new Hono<Env>();
const deckSource = withR2Assets(decks.source, {
  bucket: (c) => c.env.DECK_ASSETS,
  cacheControl: "public, max-age=31536000, immutable",
});

app.get("/", async (c) => c.html(renderHomePage(await deckSource.listDecks(c))));
app.get("/decks/:slug/about", deckContext({ source: deckSource, mountPath: "/decks" }), (c) =>
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
  decksRouter({
    source: deckSource,
    viewer: {
      head: renderSampleViewerHead(),
    },
  }),
);

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;
