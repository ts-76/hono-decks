import build from "@hono/vite-build/cloudflare-workers";
import adapter from "@hono/vite-dev-server/cloudflare";
import { honoDecks } from "hono-decks/vite";
import honox from "honox/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    honoDecks(),
    honox({
      devServer: { adapter },
    }),
    build(),
  ],
});
