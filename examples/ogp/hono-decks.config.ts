import { defineDecksConfig } from "hono-decks";

export default defineDecksConfig({
  mountPath: "/decks",
  build: { root: "decks", outDir: "src/generated" },
  router: {
    viewer: { openGraph: true },
  },
});
