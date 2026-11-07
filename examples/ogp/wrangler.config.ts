import { defineWranglerConfig } from "wrangler/experimental-config";

export default defineWranglerConfig({
  build: {
    command: "bun run decks:compile:hook",
    watchDir: ["decks", "scripts", "assets/fonts"],
  },
  types: {
    generate: false,
  },
  assetsDirectory: "./public",
});
