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
- `hono-decks/vite`: Vite integration for compiling and watching decks during development
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

For documentation authoring, component locations, and site configuration, see [the documentation site guide](docs/README.md).

## Maintainer release flow

GitHub Actions publishes `hono-decks` to npm from Conventional Commits merged into `main`. semantic-release determines the next version from the latest release tag and subsequent commits: `feat` produces a minor release, `fix` and `perf` produce patch releases, and breaking changes produce a major release. `fix(ci)` does not trigger a release. CI runs `bun run check` for pull requests. On `main`, the release workflow runs the same checks and `bun run smoke:package:compat` before semantic-release.

For a breaking release, retain `feat!:` (or `feat(scope)!:`) or a `BREAKING CHANGE:` footer in the final commit message. When squash-merging, confirm the marker in the final squash commit message; the PR body alone is not used to determine the release.

The checked-in `packages/decks/package.json` may retain an earlier bootstrap version; semantic-release updates it in the release workspace before publishing. `scripts/verify-release-baseline.mjs` checks that the tag matching that source version exists in the checked-out history. If the tag is missing, the release workflow validates the source and skips publication. Check [npm](https://www.npmjs.com/package/hono-decks) or [GitHub Releases](https://github.com/ts-76/hono-decks/releases) for the current published version. The release workflow also runs `bun run smoke:package:compat` against the declared Vite 6, 7, and 8 peer range.

For manual browser and PDF verification, run the following checks. The release workflow runs `bun run check` and `bun run smoke:package:compat`; these browser/PDF checks are not currently automated. Both commands require the `agent-browser` Chromium binary, and PDF preview validation also needs Poppler or macOS Quick Look. See [the basic example's local smoke checks](examples/basic/README.md#local-smoke-checks) for setup details.

```bash
bun run smoke:viewport
bun run smoke:pdf
```

The local `smoke:pdf` check renders the `/print` surface with a developer-local browser; it does not call `/export.pdf` or Cloudflare Browser Run. The production export route uses the `BROWSER` binding. To validate that deployed or remote-bound path, set an origin and export token, then run the credentialed smoke:

```bash
export HONO_DECKS_BROWSER_RUN_ORIGIN=https://your-worker.example.com
export HONO_DECKS_BROWSER_RUN_TOKEN=your-export-token
bun run smoke:browser-run
```

This credentialed check requires a deployed or remote-bound Worker and is not part of generic CI or release validation until such an environment is configured.

For repeatable credentialed validation, configure the protected `browser-run-smoke` environment with the `HONO_DECKS_BROWSER_RUN_ORIGIN` environment variable and `HONO_DECKS_BROWSER_RUN_TOKEN` secret, restrict it to `main`, and trigger the `Browser Run smoke` workflow manually. This workflow calls the real `/export.pdf` route and uploads the returned PDFs; it does not install or invoke a local browser.

The command block below mirrors the checks and release command that GitHub Actions runs after the merge; do not treat `bun run release` as part of the pre-merge browser/PDF gate.

```bash
bun install --frozen-lockfile
bun run check
bun run smoke:package:compat
bun run release
```

For a new baseline, first publish the exact version in `packages/decks/package.json` and create the matching annotated tag before enabling publication. `npm publish` requires an npm account login and 2FA. Configure GitHub Actions as a Trusted Publisher in the npm settings for the `hono-decks` package:

- Organization or user: `ts-76`
- Repository: `hono-decks`
- Workflow filename: `release.yml`

Releases use GitHub OIDC and provenance, so do not store an npm token in GitHub Secrets. Keep the package version, published npm version, and matching Git tag on the same release baseline.

## Markdown adapters

The deck compiler accepts a build-only module reference as well as the existing
`build.markdown: "void"` preset:

```ts
export default defineDecksConfig({
  mountPath: "/slides",
  router: { clientEntryAssetPath: "/_assets/client" },
  build: {
    root: "decks",
    markdown: { adapter: "hono-decks/adapters/hono-markdown" },
  },
});
```

The Hono Markdown bridge uses `@ts-76/hono-markdown/compiler` and its browser
runtime. The common package has no Void or Vite dependency.

With `@ts-76/hono-markdown` 0.2.1 or newer, parser dependencies are installed automatically. Do not add `markdown-exit` or `markdown-it-container` to new apps. Existing Void 1.1 apps using adapter 0.6 retain automatic installation of its legacy parser peers.

Install its optional compiler peers when selecting this adapter. Existing
Void configurations continue to work with the adapter's public compiler API,
including compatible earlier adapter versions. `init --framework void
--install` retains the one-command setup and unchanged dev/build scripts.

Keep the adapter reference in config as a string: config is also imported by the
server runtime. The compiler loads adapters only during builds. Hono+Vite and
HonoX continue to default to MDX without installing Void or Markdown peers.
For Markdown in these hosts, install the common package and its compiler peers
and select the bridge above. Vite uses virtual modules; `hono-decks compile`
continues to emit files.

Custom build adapters export `createMarkdownAdapter({ cwd, options })`, returning
`read(source)`, asynchronous `compile(source, { sourcePath })`, and
`client(islands)`. Types are exported from `hono-decks/adapters/hono-markdown`.
The deck host owns splitting, metadata, assets, routing and the visible-slide
hydration gate; Markdown compilation and island scheduling belong to the adapter.
Document adapters such as honoxpress can use the same Markdown package in a Void
app without importing deck internals or changing their route ownership.

Hono+Vite/HonoX init selects the extensionless `/_assets/client` route because
`@hono/vite-dev-server` excludes `.js` requests by default. The client still goes
through the application's middleware and authorization. Existing standalone CLI
configurations retain their default `/_assets/client.js` route. For local
Markdown checks without Void, set `HONO_MARKDOWN_PACKAGE` to the common tarball
and run `node scripts/verify-vite-init.mjs`.
