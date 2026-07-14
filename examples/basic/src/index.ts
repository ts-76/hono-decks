import { Hono } from "hono";
import type { DeckContextVariables } from "hono-decks";
import type { DecksConfigEnv } from "../hono-decks.config";
import { decks } from "./decks";
import {
  renderDeckDetailsPage,
  renderHomePage,
} from "./pages";

interface Env extends DecksConfigEnv {
  Variables: DeckContextVariables;
}

const app = new Hono<Env>();

app.get("/", async (c) => c.html(renderHomePage(await decks.source.listDecks(c))));
app.get(
  `${decks.mountPath}/:slug/about`,
  decks.context(),
  (c) =>
    c.html(renderDeckDetailsPage({
      deck: c.var.deck,
      meta: c.var.deckMeta,
      toc: c.var.deckToc,
    })),
);
app.route(decks.mountPath, decks.router());

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;
