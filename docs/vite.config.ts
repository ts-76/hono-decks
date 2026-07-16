import build from "@hono/vite-build/cloudflare-workers";
import adapter from "@hono/vite-dev-server/cloudflare";
import { honoDecks } from "hono-decks/vite";
import honox from "honox/vite";
import { defineConfig, lazyPlugins } from "vite-plus";

export default defineConfig({
  plugins: lazyPlugins(() => [
    honoDecks(),
    honox({
      devServer: { adapter },
      client: { input: ["/app/style.css", "/app/client.ts"] },
    }),
    build(),
  ]),
});
