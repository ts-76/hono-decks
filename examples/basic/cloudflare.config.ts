import { bindings, defineConfig } from "cf/config";

export default defineConfig((ctx) => ({
  ...(ctx.mode === "production" ? { accountId: "934c6255d681d05e1fa9903560de8a59" } : {}),
  worker: {
    name: "hono-decks-basic",
    entrypoint: "src/index.ts",
    compatibilityDate: "2026-07-14",
    compatibilityFlags: ["nodejs_compat"],
    ...(ctx.mode === "production" ? { domains: ["basic.hono-decks.com"] } : {}),
    env: {
      BROWSER: bindings.browser({}),
      ...(ctx.mode !== "production" ? { DECK_ASSETS: bindings.r2({ name: "hono-decks-basic-assets" }) } : {}),
    },
  },
}));
