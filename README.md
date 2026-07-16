# hono-decks

<p align="center">
  <img src="docs/public/icon-512.png" alt="Hono Decks: Hono flame on a stack of presentation slides" width="160" />
</p>

English | [日本語](https://github.com/ts-76/hono-decks/blob/main/README.ja.md)

This monorepo contains hono-decks, a toolkit for serving MDX slide decks from Hono applications and Cloudflare Workers. The CLI compiles MDX into TypeScript modules, so Workers only load generated modules at runtime.

## Quick start

```bash
bun add hono hono-decks
bunx hono-decks init
bunx hono-decks compile
```

`init` creates `hono-decks.config.ts` and `src/decks.ts`.

```ts
// hono-decks.config.ts
import { defineDecksConfig } from "hono-decks";

export default defineDecksConfig({
  mountPath: "/decks",
  build: {
    root: "decks",
    outDir: "src/generated",
  },
});
```

```ts
// src/decks.ts
import config from "../hono-decks.config";
import { createDecks } from "./generated/decks";

export const decks = createDecks(config);
```

```ts
// src/index.ts
import { Hono } from "hono";
import { decks } from "./decks";

const app = new Hono();
app.get("/", (c) => c.redirect(decks.paths("welcome").viewer));
app.route(decks.mountPath, decks.router());
export default app;
```

Add `decks/welcome/deck.mdx`, then open `/decks/welcome` to view the deck.

## API model

`hono-decks.config.ts` is the single source of truth for the CLI and runtime. You do not need to specify separate mount paths for compiled asset URLs and `app.route()`.

The generated module returns a configured kit containing the operations your application needs.

```ts
decks.mountPath;
decks.source;
decks.router();
decks.context();
decks.paths("welcome");
```

`decks.paths(slug)` returns the following route map.

```ts
{
  viewer,
  render,
  print,
  presentation,
  presenter,
  embed,
  exportPdf,
  exportPng,
  ogImage,
  assets,
}
```

Use this path map or `DeckPageMeta.paths` in custom viewers and routes instead of concatenating strings.

```ts
router: {
  viewer: {
    controls: {
      after: ({ meta }) => [
        { type: "link", href: `${meta.paths.viewer}/about`, label: "Details" },
      ],
    },
  },
}
```

## Dev integration

Integrate generation into the existing `dev` command. For Cloudflare Workers, use Wrangler's custom build configuration.

```jsonc
// wrangler.jsonc
{
  "build": {
    "command": "hono-decks compile",
    "watch_dir": ["decks"]
  }
}
```

This automatically recompiles decks when they change. Use `wrangler dev --live-reload` in the dev script to refresh the browser as well. For HonoX or Vite applications, add the plugin to the existing Vite config.

```ts
import { honoDecks } from "hono-decks/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [honoDecks()],
});
```

The Vite plugin triggers a full reload after a successful compile. With either integration, users only need to run the existing `bun run dev` command. `hono-decks compile --watch` remains available as a lower-level option for custom tooling.

Use `hono-decks compile --config path/to/config.ts` only when the config file has a custom name. Put `root` and `outDir` under `build`, and put `mountPath` at the top level of the config.

## Runtime configuration

Every resolver accepts a single object argument.

```ts
import {
  defineDecksConfig,
  type DeckBrowserRunBinding,
} from "hono-decks";

interface AppEnv {
  Bindings: {
    BROWSER?: DeckBrowserRunBinding;
    DECK_EXPORT_TOKEN?: string;
  };
}

export default defineDecksConfig<AppEnv>({
  mountPath: "/decks",
  build: { root: "decks", outDir: "src/generated" },
  router: {
    presenter: {
      enabled: ({ dev }) => dev,
      viewerControl: true,
    },
    export: {
      authorize: ({ c }) =>
        c.req.header("authorization") === `Bearer ${c.env.DECK_EXPORT_TOKEN}`,
      browser: ({ c }) => c.env.BROWSER,
      pdf: true,
      png: true,
    },
  },
});
```

When `dev` is omitted, hono-decks infers it from the `NODE_ENV` set by Vite or Wrangler. With the standard setup, `vite` and `wrangler dev` run in development mode, while production builds and `wrangler deploy` run in production mode. An explicit value such as `dev: false`, or a resolver, takes precedence. Environments that cannot be identified default to production mode.

`decks.router(overrides)` merges nested options while preserving the config. Set `export: false`, `embed: false`, or `presenter: false` to disable a feature explicitly.

## Custom routes

```ts
import type { DeckContextVariables } from "hono-decks";
import { decks } from "./decks";

const app = new Hono<{ Variables: DeckContextVariables }>();

app.get(
  `${decks.mountPath}/:slug/about`,
  decks.context(),
  (c) => c.html(renderDetails({
    deck: c.var.deck,
    meta: c.var.deckMeta,
    toc: c.var.deckToc,
  })),
);
```

The configured middleware shares its source, mount path, and draft/development policy with the standard router.

## Directory-based decks

```text
decks/product/
  deck.mdx
  theme.css
  assets/
    architecture.svg
  components/
    index.tsx
    client/
      index.tsx
```

- `theme.css`: deck-specific styles
- `assets/`: local assets rewritten to public paths during compilation
- `components/index.tsx`: server components
- `components/client/index.tsx`: island components hydrated in the browser

## Embed / export / print

Enable external iframes explicitly with `router.embed`, and list every allowed embedding origin in `frameAncestors`.

```ts
router: {
  embed: {
    frameAncestors: ["https://blog.example.com"],
    robots: false,
  },
}
```

For PDF and PNG exports, return the Cloudflare Browser Rendering binding from `browser: ({ c }) => c.env.BROWSER`. Export controls appear only for requests accepted by `authorize`.

In the viewer, `Cmd + P` or `Ctrl + P` opens the print route and includes every slide in the print job.

## Build-time OGP images

When `router.viewer.openGraph` is enabled, the viewer uses `decks.paths(slug).ogImage` to emit absolute Open Graph and Twitter Card image URLs. The core package does not include an image-generation library.

```ts
router: {
  viewer: { openGraph: true },
}
```

`examples/ogp` provides a recipe that installs Satori and resvg only in the example, generates 1200×630 PNG files from frontmatter at build time, and serves them through Workers Static Assets. It does not require a Browser Rendering binding. `build.ogpCacheFile` is an external metadata cache for LinkCards inside slides and is separate from this share-image generation.

## Public entries

- `hono-decks`: `defineDecksConfig`, configured-kit types, customization, and deck authoring
- `hono-decks/advanced`: low-level APIs for assembling raw routers, sources, and renderers
- `hono-decks/client`: client-island hydration
- `hono-decks/node`: compiler and local-filesystem adapters
- `hono-decks/cli`: programmatic CLI

Most applications should use the root entry and the generated `createDecks(config)` function.

```ts
import { decksRouter, manifestDeckSource } from "hono-decks/advanced";

const source = manifestDeckSource(manifest);
app.route("/internal", decksRouter({ source }));
```

Use the advanced entry only when building a custom source or pipeline.

## Examples

- `examples/minimal`: minimal standalone Worker
- `examples/basic`: R2 assets, Browser Rendering, custom pages, and client components
- `examples/honox`: mounting the router in a HonoX route
- `examples/ogp`: browserless build-time OGP generation with Satori
- `docs`: documentation site and embedded demo

Every example uses the same `hono-decks.config.ts` contract. The example scripts update generated modules before `decks:compile`, `typecheck`, `test`, and `deploy`.

## Cloudflare

Copy-ready Worker examples use JSONC Wrangler configs, a current compatibility date, `nodejs_compat`, and binding types generated by `wrangler types`. Store secrets with `wrangler secret put`, not in the config's `vars` section.

## Maintainer release flow

GitHub Actions publishes `hono-decks` to npm from Conventional Commits merged into `main`. During the 0.x series, `feat` and breaking changes produce minor releases, while `fix` and `perf` produce patch releases. CI runs `bun run check` for pull requests. On `main`, the release workflow runs the same checks before semantic-release.

The first `0.1.0` release must be published manually because no npm package or baseline release tag exists yet. Until a baseline tag exists, the release workflow performs validation and safely skips publication.

```bash
bun install --frozen-lockfile
bun run check
cd packages/decks
npm publish --access public
cd ../..
git tag -a v0.1.0 -m "hono-decks v0.1.0"
git push origin v0.1.0
```

`npm publish` requires an npm account login and 2FA. After publishing, configure GitHub Actions as a Trusted Publisher in the npm settings for the `hono-decks` package:

- Organization or user: `ts-76`
- Repository: `hono-decks`
- Workflow filename: `release.yml`

Subsequent releases use GitHub OIDC and provenance, so do not store an npm token in GitHub Secrets. Attach the tag to the exact commit used to publish `0.1.0`.
