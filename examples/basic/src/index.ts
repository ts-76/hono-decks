import { Hono } from "hono";
import { honoSlides, honoSlidesRouter, manifestDeckSource } from "hono-slides";
import { deckComponents } from "./generated/deck-components";
import { deckManifest } from "./generated/deck-manifest";

export { honoSlides, honoSlidesRouter };

interface Env {}

const app = new Hono<{ Bindings: Env }>();

app.get("/", (c) => c.redirect("/decks"));
app.route(
  "/decks",
  honoSlidesRouter({
    source: manifestDeckSource(deckManifest),
    components: deckComponents,
  }),
);

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;
