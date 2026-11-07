import { Hono } from "hono";
import { decksRouter } from "../../packages/decks/src/server/router";
import { manifestDeckSource } from "../../packages/decks/src/source/manifest-source";
export { DeckRemoteRoom } from "../../packages/decks/src/remote";

// Local-only fixture: never deploy. Authentication is intentionally permissive.
const app = new Hono<{ Bindings: { ROOMS: DurableObjectNamespace } }>();
const deck = {
  slug: "demo", sourcePath: "demo.mdx", kind: "directory" as const,
  meta: { title: "Remote demo", draft: false, meta: {} },
  slides: ["First", "Second", "Third"].map((title, index) => ({ index, meta: { title, layout: "default", meta: {} }, html: `<h1>${title}</h1>`, notes: `Private note ${index + 1}`, components: [] })),
  assets: [], warnings: [],
};
app.route("/decks", decksRouter({ source: manifestDeckSource({ decks: [deck] }), remote: { namespace: ({ c }) => c.env.ROOMS, authorize: () => true } }));
export default app;
