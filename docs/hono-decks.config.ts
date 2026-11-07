import { defineDecksConfig } from "hono-decks";

export default defineDecksConfig({
  mountPath: "/demo",
  build: { root: "decks" },
});
