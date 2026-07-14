import { defineDecksConfig } from "hono-decks";

export default defineDecksConfig({
  mountPath: "/decks",
  build: { root: "decks", outDir: "app/generated" },
});
