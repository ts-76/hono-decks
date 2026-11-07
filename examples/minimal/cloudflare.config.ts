import { defineConfig } from "cf/config";

export default defineConfig((ctx) => ({
  ...(ctx.mode === "production" ? { accountId: "934c6255d681d05e1fa9903560de8a59" } : {}),
  worker: {
    name: "hono-decks-minimal",
    entrypoint: "src/index.ts",
    compatibilityDate: "2026-07-14",
    compatibilityFlags: ["nodejs_compat"],
    ...(ctx.mode === "production" ? { domains: ["minimal.hono-decks.com"] } : {}),
  },
}));
