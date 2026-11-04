import build from "@hono/vite-build/cloudflare-workers";
import adapter from "@hono/vite-dev-server/cloudflare";
import mdx from "@mdx-js/rollup";
import { honoDecks } from "hono-decks/vite";
import honox from "honox/vite";
import { docsMetadataPlugin, remarkDocsCode, remarkDocsComponents, remarkDocsHeadings } from "honoxpress/build";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import remarkGfm from "remark-gfm";
import { defineConfig, lazyPlugins } from "vite-plus";
import { components } from "./app/mdx-components";
import docsSite from "./app/docs.config";

export default defineConfig({
  optimizeDeps: {
    noDiscovery: true,
    include: [
      "honox/client",
      "honox/vite/components",
      "honox/server/components",
      "hono/jsx",
      "hono/jsx/jsx-runtime",
      "hono/jsx/jsx-dev-runtime",
      "hono/jsx/dom",
    ],
  },
  plugins: lazyPlugins(() => [
    honoDecks(),
    honox({
      devServer: { adapter },
      client: { input: ["/app/style.css", "/app/client.ts"] },
    }),
    mdx({
      jsxImportSource: "hono/jsx",
      providerImportSource: "/app/mdx-components",
      remarkPlugins: [
        remarkFrontmatter,
        [remarkMdxFrontmatter, { name: "frontmatter" }],
        remarkGfm,
        remarkDocsHeadings,
        remarkDocsCode,
        [remarkDocsComponents, { names: Object.keys(components) }],
      ],
    }),
    docsMetadataPlugin({
      locales: Object.keys(docsSite.localeLabels),
      defaultLocale: docsSite.defaultLocale,
      routeRoot: "app/content",
      worker: false,
    }),
    build(),
  ]),
});
