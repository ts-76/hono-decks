import { defineDecksConfig } from "hono-decks";

export default defineDecksConfig({
  mountPath: "/slides",
  build: { root: "decks", outDir: "lib/generated" },
  router: {
    embed: { frameAncestors: ["'self'", "https://hono-decks.com"], robots: false },
    pages: { index: false, viewer: true, print: false, presentation: false, presenter: false },
    presenter: false,
  },
});
