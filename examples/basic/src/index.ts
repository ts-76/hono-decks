import { Hono } from "hono";
import { jsx } from "hono/jsx/jsx-runtime";
import { defineSlideComponents, honoSlides, honoSlidesRouter, manifestDeckSource } from "hono-slides";
import { deckManifest } from "./generated/deck-manifest";

export { honoSlides, honoSlidesRouter };

interface Env {}

const app = new Hono<{ Bindings: Env }>();
const slideComponents = defineSlideComponents({
  Badge: (props) =>
    jsx("p", {
      class: "sample-badge",
      children: String(props.label),
    }),
});

app.get("/", (c) => c.redirect("/decks"));
app.route(
  "/decks",
  honoSlidesRouter({
    source: manifestDeckSource(deckManifest),
    components: slideComponents,
    style: ".sample-badge{display:inline-flex;margin-top:1rem;padding:.35rem .6rem;border-radius:8px;background:#dff7ff;color:#062633;font-weight:700}",
  }),
);

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;
