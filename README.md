# hono-decks

<p align="center">
  <img src="assets/icon-512.png" alt="Hono Decks: Hono flame on a stack of presentation slides" width="160" />
</p>

English | [日本語](https://github.com/ts-76/hono-decks/blob/main/README.ja.md)

This monorepo contains hono-decks, a toolkit for serving MDX slide decks from Hono applications and Cloudflare Workers. The CLI compiles MDX into TypeScript modules, so Workers only load generated modules at runtime.

CLI init creates the app-owned `decks/index.ts`, registers `#decks` in package.json, and keeps intermediate code in the ignored `.hono-decks/` cache. Existing dev/build/typecheck/test/deploy scripts are preserved and prefixed with compilation. Vite continues to use in-memory virtual modules. Explicit `build.outDir` paths remain supported for custom pipelines. Basic, Minimal, and OGP use `cf dev/build/deploy`; their `wrangler.config.ts` only configures the current cf bundler backend.

The cf examples rebuild the local Worker on deck edits. The current cf backend does not accept Wrangler’s `--live-reload` flag; refresh the browser after edits. Vite live updates are unchanged.

## Quick start

```bash
bun add hono hono-decks
bunx hono-decks init
bunx hono-decks compile
```

`init` creates three files and adds `/.hono-decks/` to `.gitignore`:

```ts
// decks/config.ts — build-only settings read by the CLI and the Vite plugin
import { defineDecksConfig } from "hono-decks";

export default defineDecksConfig({
  mountPath: "/decks",
  build: {
    root: "decks",
    outDir: ".hono-decks",
  },
});
```

```ts
// decks/index.ts — runtime options live here
import { createDecks } from "#decks";

export const decks = createDecks();
```

```mdx
---
title: Welcome
---

# Welcome
```

Mount the router in your app, then open `/decks/welcome`.

```ts
// src/index.ts
import { Hono } from "hono";
import { decks } from "../decks";

const app = new Hono();
app.get("/", (c) => c.redirect(decks.paths("welcome").viewer));
app.route(decks.mountPath, decks.router());
export default app;
```

Upgrading from 1.x? See [MIGRATION.md](MIGRATION.md).

## API model

`hono-decks.config.ts` is build-only: the CLI and the Vite plugin read it, and the Worker never imports it. The compiler bakes `mountPath` into asset URLs and into the generated module, so `decks.mountPath` is always the path the decks were compiled for. Mounting the router anywhere else fails with an explicit error instead of serving broken links.

The generated `createDecks(options)` returns the API your application needs.

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
  overview,
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
createDecks({
  viewer: {
    controls: {
      after: ({ meta }) => [
        { type: "link", href: `${meta.paths.viewer}/about`, label: "Details" },
      ],
    },
  },
});
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

This automatically recompiles decks when they change. Use `wrangler dev --live-reload` in the dev script to refresh the browser as well. Generated files are rebuilt by every dev, build, and typecheck run, so keep `.hono-decks/` out of version control.

For HonoX or Vite applications, run `hono-decks init --framework hono` (or `honox`, `void`), or add the plugin yourself. The plugin keeps the compiled modules in memory and exposes them as `virtual:hono-decks`; nothing is written to disk.

```ts
// vite.config.ts
import { honoDecks } from "hono-decks/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [honoDecks()],
});
```

```ts
// src/decks.ts
/// <reference types="hono-decks/vite-env" />
import { createDecks } from "virtual:hono-decks";

export const decks = createDecks();
```

The Vite plugin triggers a full reload after a successful compile. With either integration, users only need to run the existing `bun run dev` command. `hono-decks compile --watch` remains available as a lower-level option for custom tooling.

Use `hono-decks compile --config path/to/config.ts` only when the config file has a custom name.

## Runtime configuration

Pass runtime options to `createDecks()`. Every resolver accepts a single object argument, and the type parameter carries your Worker bindings into `c.env`.

```ts
// src/decks.ts
import type { DeckBrowserRunBinding } from "hono-decks";
import { createDecks } from "#decks";

interface AppEnv {
  Bindings: {
    BROWSER?: DeckBrowserRunBinding;
    DECK_EXPORT_TOKEN?: string;
  };
}

export const decks = createDecks<AppEnv>({
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
});
```

When `dev` is omitted, hono-decks infers it from the `NODE_ENV` set by Vite or Wrangler. With the standard setup, `vite` and `wrangler dev` run in development mode, while production builds and `wrangler deploy` run in production mode. An explicit value such as `dev: false`, or a resolver, takes precedence. Environments that cannot be identified default to production mode.

`decks.router(overrides)` merges overrides with one rule: objects merge recursively, arrays concatenate, and every other value — including `false` and functions — replaces the base. Set `export: false`, `embed: false`, or `presenter: false` to disable a feature explicitly.

Missing decks, drafts in production, and disabled pages fall through to your application's `notFound` handler, so `app.notFound()` controls the 404 page.

Decorate the compiled source with `source`, for example to serve assets from R2:

```ts
import { withR2Assets } from "hono-decks";

export const decks = createDecks<AppEnv>({
  source: (source) => withR2Assets(source, { bucket: (c) => c.env.DECK_ASSETS }),
});
```

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

## Extending the default styles

hono-decks keeps its default look in two cascade layers, `@layer hono-decks.base` (tokens, page defaults, slide typography) and `@layer hono-decks.components` (built-in components, viewer, presenter, and overview chrome). Every selector in them is wrapped in `:where()`, so it has zero specificity. Any unlayered rule overrides the defaults without `!important` or longer selectors: your `theme.css`, CSS emitted by deck components, the router `style` option, `viewer.style`, or host page styles.

```css
/* decks/product/theme.css: a plain selector is enough */
code {
  border-radius: 999px;
}
```

The viewer shows slide progress as a 4px bar along the bottom edge of the slide, with the exact position kept as `role="progressbar"` values and visually hidden text for assistive technology. Set `viewer.controls.progress` to `"count"` for the `n / total` badge or `"both"` for the badge above the bar (default `"bar"`). Recolor the bar with `--hono-decks-viewer-progress-color` and `--hono-decks-viewer-progress-track`, or hide progress with `viewer.controls.hidden: ["position"]`.

Runtime rules stay unlayered with their usual specificity: slide stacking, transitions, step reveals, fitting the canvas, and print layout. A theme rule such as `.slide { position: relative; }` therefore cannot break presentation mechanics. Tune them through custom properties instead, such as `--hono-decks-transition-duration`, `--hono-decks-transition-easing`, and the `--fire-*` variables on `[data-fire-effect]`.

If your own styles are also layered (for example Tailwind CSS v4), declare the order before any hono-decks styles load so your layers come after it:

```css
@layer hono-decks, theme, base, components, utilities;
```

## Embed / export / print

Enable external iframes explicitly with the `embed` option, and list every allowed embedding origin in `frameAncestors`.

```ts
createDecks({
  embed: {
    frameAncestors: ["https://blog.example.com"],
    robots: false,
  },
});
```

For PDF and PNG exports, return the Cloudflare Browser Rendering binding from `browser: ({ c }) => c.env.BROWSER`. Export controls appear only for requests accepted by `authorize`.

In the viewer, `Cmd + P` or `Ctrl + P` opens the print route and includes every slide in the print job.

## Slide overview

`/:slug/overview` shows every slide as a thumbnail in a responsive grid, using the deck's theme. Each thumbnail opens the viewer at that slide, and the viewer's grid button opens the overview with the current slide highlighted. Disable it with `pages: { overview: false }`, or hide only the button with `viewer.controls.hidden: ["overview"]`.

## Build-time OGP images

When `viewer.openGraph` is enabled, the viewer uses `decks.paths(slug).ogImage` to emit absolute Open Graph and Twitter Card image URLs. The core package does not include an image-generation library.

```ts
createDecks({
  viewer: { openGraph: true },
});
```

`examples/ogp` provides a recipe that installs Satori and resvg only in the example, generates 1200×630 PNG files from frontmatter at build time, and serves them through Workers Static Assets. It does not require a Browser Rendering binding. `build.ogpCacheFile` is an external metadata cache for LinkCards inside slides and is separate from this share-image generation.

### X (Twitter) Player Card

Set `twitterPlayer` to let posts play the deck inline. The card points at the deck's `embed` route, so enable `embed` too; hono-decks then allows X's origins in that route's `frame-ancestors`. The player must be served over HTTPS.

```ts
createDecks({
  embed: {},
  viewer: { openGraph: { twitterPlayer: true } }, // or { width: 1280, height: 720 }
});
```

X no longer publishes Player Card documentation, so behavior can change. In a [public test from October 2026](https://thehouse.game/updates/2026-10-22-interactive-x-embeds), regular posts played the embed inline on the web without any approval step, X's mobile apps opened the embed URL in a web view instead, and X Articles did not run the player. Keep `ogImage` meaningful for clients that show only the image. X caches cards per URL; after changing tags, share a new URL (for example with a query string) to see the update.

## Public entries

- `hono-decks`: `defineDecksConfig`, runtime option types, customization, and deck authoring
- `hono-decks/advanced`: Worker-safe low-level APIs for assembling raw routers, sources, and renderers
- `hono-decks/client`: client-island hydration
- `hono-decks/node`: Node-only compiler, config loader, and local-filesystem adapters
- `hono-decks/vite`: Vite integration for compiling and watching decks during development
- `hono-decks/honox`: HonoX route integration (used by `virtual:hono-decks/honox`)
- `hono-decks/cli`: programmatic CLI

Most applications should use the root entry and the generated `createDecks()` function.

```ts
import { decksRouter, manifestDeckSource } from "hono-decks/advanced";

const source = manifestDeckSource(manifest);
app.route("/internal", decksRouter({ source }));
```

Use the advanced entry only when building a custom source or pipeline.

## Examples

- `examples/minimal`: minimal standalone Worker
- `examples/basic`: R2 assets, Browser Rendering, custom pages, and client components
- `examples/honox`: inserting the router into HonoX file routes with `virtual:hono-decks/honox`
- `docs`: documentation site and embedded demo
- `examples/ogp`: browserless build-time OGP generation with Satori
- [`examples/void`](examples/void): deployed Void integration and same-origin iframe; an independent npm example pinned to published `hono-decks@1.4.6` (run `npm ci`, `npm run typecheck`, and `npm run build` inside that directory). It is excluded from the Bun workspace and checked by its own CI job. The Bun examples are listed explicitly in the root `workspaces`; add future Bun examples to that list.

Every example uses the same split: build settings in `hono-decks.config.ts`, runtime options in the app's decks module. The Wrangler examples compile decks before `typecheck`, `test`, `dev`, and `deploy`; run `bun run generate` at the root to compile them all.

## Contributing

```bash
bun install
bun run --cwd packages/decks test   # unit tests against src, no build needed
bun run check                       # full gate (build, generate, lint+format, typecheck, tests)
```

Workspace typechecks and tests run in parallel. `*.dist.test.ts` files inspect the published build and run through `bun run --cwd packages/decks test:dist`.

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
  mountPath: "/decks",
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

The compiler loads adapters only during builds; the config file is never part
of the Worker bundle. Hono+Vite and HonoX continue to default to MDX without
installing Void or Markdown peers. For Markdown in these hosts, install the
common package and its compiler peers and select the bridge above. Vite uses
virtual modules; `hono-decks compile` continues to emit files.

Custom build adapters export `createMarkdownAdapter({ cwd, options })`, returning
`read(source)`, asynchronous `compile(source, { sourcePath })`, and
`client(islands)`. Types are exported from `hono-decks/adapters/hono-markdown`.
The deck host owns splitting, metadata, assets, routing and the visible-slide
hydration gate; Markdown compilation and island scheduling belong to the adapter.
Document adapters such as honoxpress can use the same Markdown package in a Void
app without importing deck internals or changing their route ownership.

The generated client bundle is served at the extensionless `/_assets/client`
route under the mount path, because `@hono/vite-dev-server` excludes `.js`
requests by default. The client still goes through the application's middleware
and authorization; override it with `createDecks({ client: { path } })`. For local
Markdown checks without Void, set `HONO_MARKDOWN_PACKAGE` to the common tarball
and run `node scripts/verify-vite-init.mjs`.

The presentation prepares images and CSS backgrounds for the next slide, reuses decoded resources within the document, and bounds background-image retention. Data Saver disables speculative preparation. Default embedded local assets use ETag revalidation (`public, max-age=0, must-revalidate`); explicit cache policies remain unchanged. Development asset responses use `no-store`.

## Presenter timer

Set `duration: 20m` in deck frontmatter for a target (also `1h30m`, `90s`, or a number of minutes). Override it with `createDecks({ presenter: { duration: 1200 } })`, in seconds, or use the same string syntax. The timer starts on navigation or with Start; press `T` to start or pause it. Reset clears it. The presenter tab retains its elapsed and paused state across reloads. With a target, the timer also shows the remaining time and your pace: each slide gets an equal share of the duration, and the timer says whether you are on pace, ahead, or behind that share.

## Development overflow warnings

In development, the active slide is checked for elements outside the 1920 × 1080 canvas and for content clipped by `overflow: hidden` or `clip`. Findings appear in a warning panel and the affected elements are outlined. Checks rerun after slide changes, resizing, image and font loading, and live updates. Add `data-hono-decks-allow-overflow` to an intentionally overflowing element to exclude its subtree. Decorative `aria-hidden="true"` subtrees are also ignored. Scrollable containers are treated as clipping boundaries; visual effects such as shadows are not measured. Production and print pages omit the checker.

## Built-in layouts

Set `layout` in slide frontmatter to `two-cols`, `image-left`, `image-right`, `section`, `quote`, or `center`, in addition to `default`, `cover`, and `statement`. In an MDX `two-cols` slide, put `::right::` on its own line with blank lines around it. Content before and after it forms the two columns.

~~~mdx
---
layout: two-cols
---
## Left

First column

::right::

## Right

Second column
~~~

For image layouts, set `image: ./assets/photo.jpg` or a remote URL and optionally `image-alt: Description`. An omitted alt makes the image decorative. Use a heading and subtitle for `section`, or a Markdown blockquote followed by attribution for `quote`. `center` centers content horizontally and vertically; `statement` only centers vertically. Adjust `--hono-decks-column-gap`, `--hono-decks-image-width`, and `--hono-decks-image-radius` in a theme. The column marker is supported in MDX decks.

## Cross-device presentation control

Cloudflare Workers can opt into live rooms with `hono-decks/remote`. Export `DeckRemoteRoom` from the Worker, bind it as a Durable Object, and configure `remote.namespace` and `remote.authorize`. The default room name is the deck slug; `session` can select another stable room, and `follow: false` starts viewers with follow paused. The presenter page and `/:slug/remote` control the presentation; authorized viewers receive position updates and can stop or resume following. Keep a presenter page open to process Next and Previous commands.

Authorization is required on every WebSocket connection. Presenter access grants control; follower access grants live position only. The remote page includes speaker notes and requires presenter authorization; the socket carries only positions and commands. Messages are validated, capped at 1 KB, and rate-limited per socket. The socket route rejects cross-origin browser requests. Protect the presenter and other routes that expose notes separately; remote authorization does not protect the whole deck. Use HTTPS, secure session cookies, and `Cache-Control: no-store` for authenticated content. Include `wss:` or `ws:` as appropriate in CSP `connect-src` (same-origin WebSockets can be covered by `'self'`, depending on browser support). See the remote recipe for the binding, migration, and authorization example.
