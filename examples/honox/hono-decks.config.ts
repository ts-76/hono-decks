import { defineDecksConfig } from "hono-decks";

export default defineDecksConfig({
  mountPath: "/decks",
  build: { root: "decks", outDir: "app/generated" },
  router: {
    embed: {
      frameAncestors: ["https://hono-decks.com"],
      viewer: { controls: { hidden: ["exportPdf", "exportPng"] } },
    },
    presenter: {
      enabled: ({ dev }) => dev,
      viewerControl: true,
    },
  },
});
