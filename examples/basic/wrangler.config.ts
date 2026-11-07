import { defineWranglerConfig } from "wrangler/experimental-config";

export default defineWranglerConfig({
  build: {
    command: "bun run decks:compile:hook",
    watchDir: ["decks"],
  },
  types: {
    generate: false,
  },
});
