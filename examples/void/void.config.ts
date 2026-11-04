import { defineConfig } from "void/config";

export default defineConfig({
  worker: { compatibility_date: "2026-02-24" },
  cloudflare: {
    name: "void-hono-decks-example",
    routes: [{ pattern: "void.hono-decks.com", custom_domain: true }],
    workers_dev: true,
    preview_urls: false,
  },
});
