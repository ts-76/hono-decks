import { defineDecksConfig } from "hono-decks";

export default defineDecksConfig({
  mountPath: "/decks",
  build: { root: "decks", outDir: "app/generated" },
  router: {
    embed: { frameAncestors: ["https://hono-decks.com"] },
    presenter: {
      enabled: ({ dev }) => dev,
      viewerControl: true,
    },
  },
});
