import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vite-plus";

const source = (path: string) => fileURLToPath(new URL(`./src/${path}`, import.meta.url));

export default defineConfig({
  resolve: {
    // Unit tests run against src, so editing the package never requires a rebuild first.
    alias: [
      { find: /^hono-decks\/node$/, replacement: source("node.ts") },
      { find: /^hono-decks\/advanced$/, replacement: source("advanced.ts") },
      { find: /^hono-decks\/vite$/, replacement: source("vite.ts") },
      { find: /^hono-decks$/, replacement: source("mod.ts") },
    ],
  },
  test: {
    environment: "node",
    // *.dist.test.ts inspect the published build; `bun run test:dist` builds first.
    exclude: [...configDefaults.exclude, "**/*.dist.test.ts"],
  },
});
