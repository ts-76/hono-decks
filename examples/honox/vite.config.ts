import build from "@hono/vite-build/cloudflare-workers";
import adapter from "@hono/vite-dev-server/cloudflare";
import honox from "honox/vite";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@hono\/decks$/,
        replacement: "@hono/decks/runtime",
      },
    ],
  },
  plugins: [
    honox({
      devServer: { adapter },
    }),
    build(),
  ],
});
