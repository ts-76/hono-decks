import { defineDecksConfig } from "hono-decks";

export default defineDecksConfig({
  mountPath: "/slides",
  build: { root: "decks", outDir: "lib/generated" },
});
