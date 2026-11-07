#!/usr/bin/env node
// Stable bin target: package managers link it before dist/ exists in a fresh workspace checkout.
import("../dist/bin.js").catch((error) => {
  if (error?.code === "ERR_MODULE_NOT_FOUND" && String(error.message).includes("dist/bin.js")) {
    console.error("hono-decks is not built. Run `bun run build` in the repository root first.");
    process.exitCode = 1;
    return;
  }
  throw error;
});
