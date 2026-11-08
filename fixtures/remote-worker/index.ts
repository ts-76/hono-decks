import { Hono } from "hono";
import { decksRouter } from "../../packages/decks/src/server/router";
import { manifestDeckSource } from "../../packages/decks/src/source/manifest-source";
export { DeckRemoteRoom } from "../../packages/decks/src/remote";

// Local-only fixture: never deploy. Authentication is intentionally permissive.
const app = new Hono<{ Bindings: { ROOMS: DurableObjectNamespace } }>();
const deck = {
  slug: "demo", sourcePath: "demo.mdx", kind: "directory" as const,
  meta: { title: "Remote demo", draft: false, meta: {} },
  // First has a 1-minute budget, Second and Third share the rest, and Appendix is outside the pace.
  slides: [{ title: "First", time: 60 }, { title: "Second" }, { title: "Third" }, { title: "Appendix", appendix: true }].map((meta, index) => ({ index, meta: { ...meta, layout: "default", meta: {} }, html: `<h1>${meta.title}</h1>`, notes: `Private note ${index + 1}`, components: [] })),
  assets: [], warnings: [],
};
app.route("/decks", decksRouter({
  source: manifestDeckSource({ decks: [deck] }),
  document: {
    lang: ({ c }) => {
      const requested = c.req.query("lang")?.trim().toLowerCase();
      return requested === "en" || requested === "ja" ? requested : "ja";
    },
  },
  presenter: { duration: "3m" },
  remote: {
    namespace: ({ c }) => c.env.ROOMS,
    authorize: () => true,
    // Behind a tunnel the Worker sees http; encode the public https URL in the QR code.
    url: ({ c, url }) => (c.req.header("x-forwarded-proto") === "https" ? url.replace(/^http:/, "https:") : url),
  },
}));
export default app;
