# hono-decks

English | [日本語](https://github.com/ts-76/hono-decks/blob/main/packages/decks/README.ja.md)

hono-decks serves MDX slide decks from Hono applications and Cloudflare Workers. It compiles MDX into TypeScript modules at build time, so the Worker runtime does not load the filesystem or the compiler.

CLI init creates the app-owned `decks/index.ts`, registers `#decks` in package.json, and keeps intermediate code in the ignored `.hono-decks/` cache. Existing dev/build/typecheck/test/deploy scripts are preserved and prefixed with compilation. Vite continues to use in-memory virtual modules. Explicit `build.outDir` paths remain supported for custom pipelines. Basic, Minimal, and OGP use `cf dev/build/deploy`; their `wrangler.config.ts` only configures the current cf bundler backend.

The cf examples rebuild the local Worker on deck edits. The current cf backend does not accept Wrangler’s `--live-reload` flag; refresh the browser after edits. Vite live updates are unchanged.

## Hono + Vite / HonoX: connect with init

Install hono-decks in an existing app and choose its integration:

~~~sh
npm install hono-decks@latest

# Hono + Vite
npx hono-decks init --framework hono

# Use this instead for HonoX
npx hono-decks init --framework honox

# Keep using the app's existing commands
npm run dev
npm run build
~~~

For a new app, `@latest` selects the current published release. To reproduce a setup, replace it with the exact version you have verified. Upgrading from 1.x? See the [migration guide](https://github.com/ts-76/hono-decks/blob/main/MIGRATION.md).

Both modes preserve the existing Vite config while adding automatic compilation,
create `hono-decks.config.ts`, `src/decks.ts`, and a sample
`decks/welcome/deck.mdx`. Generated code stays in Vite virtual modules and is not written to disk.
Normal `dev` and `build` work from a checkout without generated files. There is
no manual `compile` step or package script change. Neither mode needs the Void adapter.

| Mode | Application connection |
| --- | --- |
| `--framework hono` | Adds the router to the existing Hono entry, preserving its middleware and routes |
| `--framework honox` | Wraps `createApp()` options with `withHonoXDecks()` from `virtual:hono-decks/honox`, preserving its options, pages, and middleware |

Open `/decks/welcome`. Init chooses another sample name if an existing deck has
that slug. Existing MDX decks, components, and images remain supported.

Hono init detects a single `src/index.ts`, `.tsx`, `.js`, `.mts`, `.mjs`, or
`src/app.ts`, `.tsx`, `.js` candidate. Use `--entry src/server.ts` for a custom
entry or multiple candidates. Automatic connection supports a default-exported
`const app = new Hono()`. It leaves files unchanged and explains manual mounting
when earlier catch-all/dynamic routes or another app shape prevent a safe edit.

HonoX init supports the standard `app/routes` layout and a default-exported
`createApp()` call in `app/server.ts`, which becomes:

~~~ts
/// <reference types="hono-decks/vite-env" />
import { withHonoXDecks } from "virtual:hono-decks/honox";
import { decks } from "../src/decks";
import { createApp } from "honox/server";

export default createApp(withHonoXDecks({ /* existing options */ }, decks.router()));
~~~

The Vite plugin serves `virtual:hono-decks/honox`, which discovers routes with
the same rules as HonoX and adds the deck router through the public HonoX
`ROUTES` API. Deck routes therefore run behind `app/routes/_middleware.ts`, and
**changing `mountPath` alone changes the public path**. There is no route
directory to create or rename and no glob to copy into the app. Conflicts with
existing routes, including dynamic and catch-all routes, are errors. A mount
change during development automatically restarts Vite after compilation so
route registrations switch together. Custom `createApp()` options, middleware,
and explicit `ROUTES` are preserved.
Both modes accept `--config config/slides.ts`.

## Void: use your existing dev and build commands

In an existing Void app, install hono-decks and a compatible Hono Markdown
adapter, then initialize once:

~~~sh
npx hono-decks init --framework void --install
npm run dev
# Production build:
npm run build
~~~

This integration requires an adapter with the `/markdown/compiler` and
`/markdown/client` exports. New installations default to `void-plugin-hono-jsx@^0.9.1`;
`--install` preserves an already installed compatible adapter. Without `--install`, also install the optional Markdown peers:
`yaml@^2.9.1 shiki@^4.5.0 @shikijs/transformers@^4.5.0`.

With `@ts-76/hono-markdown` 0.2.1 or newer, parser dependencies are installed automatically. Do not add `markdown-exit` or `markdown-it-container` to new apps. Existing Void 1.1 apps using adapter 0.6 retain automatic installation of its legacy parser peers.
The verified host versions are Void 1.2.1, Vite 8.3.4, and Hono 4.13.16 on Node >=24.22.1 <25. Existing Void 1.1.11 apps keep their compatible 0.6 adapter; if it is missing, init selects 0.6 rather than forcing a host upgrade. Adapter 0.9.1 retains the documented [Void/Cloudflare dependency risks](https://github.com/ts-76/void-plugin-hono-jsx/blob/v0.9.1/docs/dependency-security.md).

`--install` selects npm/pnpm/Yarn/Bun from packageManager or lockfiles and installs
missing dependencies. Incompatible installed versions require an explicit update;
existing scripts are preserved. Yarn requires its node_modules linker; use manual
installation for PnP. Omit `--install` to manage dependencies yourself. To use a local adapter build, pass `--adapter /absolute/path/void-plugin-hono-jsx.tgz`.
Conflicting app files are checked before installation. Installation failures do not
write integration files; dependency and lockfile changes may remain.

`init --framework void` wraps the default export in the existing root
`vite.config.*` with `withHonoDecks()` and creates:

- `hono-decks.config.ts`: `/decks` mount, `decks` source directory, Hono Markdown enabled
- `src/decks.ts`: the app-owned module that passes runtime options to `createDecks()`
- `middleware/hono-decks.ts`: complete slide subtree routing, Markdown CSS, and dev reload support
- `decks/welcome/deck.md` and `Counter.tsx`: an interactive two-slide sample at `/decks/welcome`

If a `welcome` deck already exists, init chooses `welcome-2` (or the next free
name) and prints its URL, preserving the existing Markdown or MDX deck.

Edit the sample or add `.md` and `.mdx` decks under `decks`. Your existing Vite
`dev` and `build` commands perform compilation automatically, including from a
checkout without generated files. No manual `compile`, extra watch process, or
`package.json` script changes are needed. Generated code stays in memory, so no
generated directory or ignore entry is needed. Existing Void entry points, routes, and package scripts are preserved.
Choose a mount path that does not conflict with app routes; apply your app's
access policy to the slide subtree when needed.

The command checks dependencies and output conflicts before writing. It refuses
to overwrite integration files or add a second hono-decks integration. It accepts
ESM default-export config objects, expressions, and async config functions. For
an unsupported config, it leaves files unchanged and explains how to register
`honoDecks()` manually. `--config config/slides.ts` selects another config path;
`--out` applies only to the generic init below.

## Client components inside Markdown

Island imports register their components automatically; no separate registry is needed.

~~~md
<script>
import Counter from "./Counter.tsx" with { island: "load" };
</script>
---
title: Interactive slide
---
# Demo

<Counter label="Count" initial="2" />
~~~

Counter.tsx exports a default Hono JSX component and can use useState from hono/jsx.
The initial HTML is rendered on the server. Hydration supports load, visible, idle,
and media:(query); visible scheduling waits for the slide to become active.
Imported CSS is compiled into deck styles, including SSR and print output.
useFrontmatter() and useMarkdownHeadings() provide each slide's context on both
server and client. Do not place secrets in metadata delivered to client islands.
Only relative default TSX/JSX imports and literal string/boolean props are supported.
JSX expressions, island tag children and arbitrary script code are unsupported.
Static imports and the existing MDX client-component workflow remain available.

## Vite modules and typechecking

Hono + Vite, HonoX, and Void use the same `virtual:hono-decks` entry. Init creates
an app-owned `src/decks.ts` that passes runtime options to it:

~~~ts
/// <reference types="hono-decks/vite-env" />
import { createDecks } from "virtual:hono-decks";

export const decks = createDecks({
  presenter: { enabled: ({ dev }) => dev },
});
~~~

The virtual module exports `createDecks(options)`, the compiled `mountPath`, and
`compiledDecks`. Bundled ambient types allow typechecking before the first dev
or build run; `createDecks<AppEnv>()` carries your bindings into resolvers.

Edit sources, images, components, and themes under `decks/`, plus your config.
Vite reads compiled code from an in-memory module map and bundles it into the
application. There is no `.hono-decks` directory to create or import and no
need to set `build.outDir`. An explicitly configured OGP metadata cache is still
written to disk. Imported config inputs (for example a separate mount-path
settings file) are also watched. Init uses Vite's `BASE_URL` for its development
client script. If the host's dev server intercepts Vite URLs, keep its existing
asset exclusions configured for the chosen base.

The non-Vite CLI `hono-decks compile` and `compileDecks()` continue to write files
to `build.outDir` / `out`. Both destinations use the same compiler. Compiler and
Node filesystem code remain outside the application runtime.

## Hono / MDX quick start

The examples below use Bun. npm, pnpm, and Yarn are supported as well.
For a Vite-hosted Hono, HonoX, or Void app, use its init flow above instead of this manual compilation flow.

~~~bash
bun add hono hono-decks
bunx hono-decks init
bunx hono-decks compile
~~~

If you use an AI agent, run `npx @tanstack/intent@latest install`. The published package includes a versioned hono-decks skill that the agent can discover from `node_modules`.

<code>init</code> creates these files without overwriting existing ones, and adds <code>/.hono-decks/</code> to <code>.gitignore</code>:

- <code>decks/config.ts</code>: build-only settings read by the CLI (never imported by the Worker)
- <code>decks/index.ts</code>: your runtime options, passed to the generated <code>createDecks()</code>
- <code>decks/welcome/deck.mdx</code>: a sample deck, when no <code>decks</code> directory exists

~~~ts
// decks/config.ts
import { defineDecksConfig } from "hono-decks";

export default defineDecksConfig({
  mountPath: "/decks",
  build: {
    root: "decks",
    outDir: ".hono-decks",
  },
});
~~~

~~~ts
// decks/index.ts
import { createDecks } from "#decks";

export const decks = createDecks();
~~~

~~~ts
// src/index.ts
import { Hono } from "hono";
import { decks } from "../decks";

const app = new Hono();
app.get("/", (c) => c.redirect(decks.paths("welcome").viewer));
app.route(decks.mountPath, decks.router());
export default app;
~~~

Run <code>bunx hono-decks compile</code>. The command updates <code>.hono-decks/decks.ts</code> and the generated slide modules. Do not edit or commit the generated directory; every dev, build, and typecheck run recreates it.

## Build config, runtime options

<code>hono-decks.config.ts</code> holds build settings only. You do not need to repeat the mount path across compiler options, <code>app.route()</code>, and asset URLs: the compiler bakes <code>mountPath</code> into the generated module. Mounting the router at a different path fails with an explicit error. The generated <code>createDecks(options)</code> function returns:

- <code>decks.mountPath</code>: the normalized path to pass to <code>app.route()</code>
- <code>decks.source</code>: the <code>DeckSource</code> after applying the <code>source</code> option
- <code>decks.router(overrides?)</code>: a router that merges call-site overrides into the options
- <code>decks.context(overrides?)</code>: middleware for application-owned routes
- <code>decks.paths(slug)</code>: the complete route map for the viewer, renderer, print view, presentation views, embeds, exports, OGP image, and assets

~~~ts
const paths = decks.paths("product");
paths.viewer;       // /decks/product
paths.render;       // /decks/product/render
paths.print;        // /decks/product/print
paths.overview;     // /decks/product/overview
paths.presentation; // /decks/product/presentation
paths.presenter;    // /decks/product/presenter
paths.embed;        // /decks/product/embed
paths.exportPdf;    // /decks/product/export.pdf
paths.exportPng;    // /decks/product/export.png
paths.ogImage;      // /decks/product/og.png
paths.assets;       // /decks/product/assets
~~~

Viewer callbacks receive the same map as <code>input.meta.paths</code>. Use it instead of rebuilding routes with string concatenation.

~~~ts
export const decks = createDecks({
  viewer: {
    controls: {
      after: ({ meta }) => [
        {
          type: "link",
          href: meta.paths.viewer + "/about",
          label: "Details",
        },
      ],
    },
  },
});
~~~

## Development integration

For Cloudflare Workers, register the deck compiler as a Wrangler custom build.

~~~jsonc
// wrangler.jsonc
{
  "build": {
    "command": "hono-decks compile",
    "watch_dir": ["decks"]
  }
}
~~~

<code>wrangler dev --live-reload</code> performs the initial compile, watches MDX, deck-local components, assets, and theme CSS, and reloads the browser. Wrangler runs the same build command during deployment.

For HonoX or another Vite application, add the plugin to the existing Vite config.

~~~ts
import { honoDecks } from "hono-decks/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [honoDecks()],
});
~~~

The plugin compiles before Vite starts and adds the deck root and <code>hono-decks.config.ts</code> to the Vite watcher. After a successful recompile, presentation pages update without reloading when existing islands can be identified safely. Their state survives supported prop and Markdown context changes, reordering, and the addition or removal of distinct islands. The current slide and step are retained. Editing an island component or other client code reloads the presentation iframe and resets island state; the viewer remains open and the slide and step are restored. Unsafe updates, such as ambiguous duplicate islands, unsupported adapter initialization, or a failed fetch, use the same fallback. In both setups, the application's normal <code>dev</code> command is enough for authoring.

## Runtime configuration

Pass runtime options to <code>createDecks()</code>. Every resolver receives one object argument, and the type parameter carries your bindings into <code>c.env</code>.

~~~ts
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
      c.req.header("authorization") === "Bearer " + c.env.DECK_EXPORT_TOKEN,
    browser: ({ c }) => c.env.BROWSER,
    pdf: true,
    png: true,
  },
});
~~~

When <code>dev</code> is omitted, hono-decks uses the <code>NODE_ENV</code> value supplied by Vite or Wrangler. The standard Vite and <code>wrangler dev</code> commands are treated as development, while production builds and <code>wrangler deploy</code> are treated as production. An explicit <code>dev: false</code> value or resolver takes precedence. Unknown environments fail closed as production.

Use <code>decks.router({ viewer: ... })</code> for call-site overrides. One rule applies everywhere: objects merge recursively, arrays concatenate, and every other value — including <code>false</code> and functions — replaces the base. Disable a feature explicitly with values such as <code>presenter: false</code>, <code>embed: false</code>, or <code>export: false</code>.

Missing decks, drafts in production, and disabled pages call <code>c.notFound()</code>, so your application's <code>app.notFound()</code> handler renders the 404 page.

## Custom application routes

~~~ts
import type { DeckContextVariables } from "hono-decks";
import { decks } from "./decks";

const app = new Hono<{ Variables: DeckContextVariables }>();

app.get(
  decks.mountPath + "/:slug/about",
  decks.context(),
  (c) => c.json({
    title: c.var.deckMeta.title,
    viewer: c.var.deckMeta.paths.viewer,
    slides: c.var.deckToc,
  }),
);
~~~

<code>decks.context()</code> shares the configured source, mount path, development policy, and viewer controls. Application routes and the built-in viewer therefore use the same draft policy and URLs.

To replace a built-in page, configure <code>viewer.render</code>. The callback receives <code>frame</code>, <code>controls</code>, <code>toc</code>, and <code>meta.paths</code>, allowing an application-owned layout to reuse the standard parts.

## Deck-local components and CSS

A directory deck can use this structure:

~~~text
decks/product/
  deck.mdx
  theme.css
  assets/
    diagram.svg
  components/
    index.tsx
    client/
      index.tsx
~~~

<code>components/index.tsx</code> contains server-side JSX components. <code>components/client/index.tsx</code> contains components hydrated in the browser. <code>theme.css</code> applies only to that deck. Without a theme, slides use a white background and dark text. Customize `--hono-decks-background` and `--hono-decks-color` together in `theme.css`. Use `px` or `rem` within the fixed 1920 × 1080 canvas; viewport units change the composition when browser zoom changes. Local images are detected during compilation and rewritten to public URLs based on the mount path and deck slug.

## Extending the default styles

hono-decks keeps its default look in two cascade layers, `@layer hono-decks.base` (tokens, page defaults, slide typography) and `@layer hono-decks.components` (built-in components, viewer, presenter, and overview chrome). Every selector in them is wrapped in `:where()`, so it has zero specificity. Any unlayered rule overrides the defaults without `!important` or longer selectors: your `theme.css`, CSS emitted by deck components, the router `style` option, `viewer.style`, or host page styles.

~~~css
/* decks/product/theme.css: a plain selector is enough */
code {
  border-radius: 999px;
}
~~~

The viewer shows slide progress as a 4px bar along the bottom edge of the slide, with the exact position kept as `role="progressbar"` values and visually hidden text for assistive technology. Set `viewer.controls.progress` to `"count"` for the `n / total` badge or `"both"` for the badge above the bar (default `"bar"`). Recolor the bar with `--hono-decks-viewer-progress-color` and `--hono-decks-viewer-progress-track`, or hide progress with `viewer.controls.hidden: ["position"]`.

Runtime rules stay unlayered with their usual specificity: slide stacking, transitions, step reveals, fitting the canvas, and print layout. A theme rule such as `.slide { position: relative; }` therefore cannot break presentation mechanics. Tune them through custom properties instead, such as `--hono-decks-transition-duration`, `--hono-decks-transition-easing`, and the `--fire-*` variables on `[data-fire-effect]`.

If your own styles are also layered (for example Tailwind CSS v4), declare the order before any hono-decks styles load so your layers come after it:

~~~css
@layer hono-decks, theme, base, components, utilities;
~~~

## Embedding

Use <code>createDeckViewerEmbed()</code> to embed multiple decks into the same document. This high-level helper builds an iframe viewer, controls, and a table of contents from a <code>CompiledDeck</code> already loaded by the application.

When embedding from an external blog, enable the <code>embed</code> option and list the allowed parent origins in <code>frameAncestors</code>. Iframe navigation does not require CORS, but it does require an appropriate CSP <code>frame-ancestors</code> directive.

~~~ts
createDecks({
  embed: {
    frameAncestors: ["https://blog.example.com"],
    robots: false,
  },
});
~~~

~~~html
<iframe
  src="https://slides.example.com/decks/product/embed"
  title="Product deck"
  allow="fullscreen"
></iframe>
~~~

## Browser export

Enable PDF and PNG exports by returning a Cloudflare Browser Rendering binding from the resolver. The viewer displays export controls only for requests accepted by <code>authorize</code>. Store export tokens as Wrangler secrets rather than in <code>vars</code>.

<code>Cmd + P</code> and <code>Ctrl + P</code> open the viewer's print route, which renders every slide for printing. Server-side export sends the same print route to Browser Rendering.

## Build-time OGP recipe

Enable <code>viewer.openGraph</code> when generating share images at build time. The default image path is <code>decks.paths(slug).ogImage</code>. The viewer derives absolute Open Graph and Twitter Card URLs from the request origin.

~~~ts
export const decks = createDecks({
  viewer: { openGraph: true },
});
~~~

Override <code>imagePath</code> with a resolver when images are served from a separate CDN. Set Open Graph configuration to <code>false</code>, or omit it, to suppress social metadata.

Image generation is intentionally not part of the core package. The <code>examples/ogp</code> recipe uses the deck metadata returned by <code>compileDecks()</code> from <code>hono-decks/node</code> to Satori and resvg, then stores 1200 by 630 PNG files in Workers Static Assets. Satori and resvg are example-only dependencies, and the recipe does not require Browser Rendering. Satori accepts TTF, OTF, and WOFF fonts but not WOFF2, so the build script must receive a font file that covers the target language.

<code>build.ogpCacheFile</code> stores external site metadata used by <code>@[card](...)</code>. It is separate from the viewer's share image.

## Slide overview

`/:slug/overview` shows every slide as a thumbnail in a responsive grid, using the deck's theme. Each thumbnail opens the viewer at that slide, and the viewer's grid button opens the overview with the current slide highlighted. Disable it with `pages: { overview: false }`, or hide only the button with `viewer.controls.hidden: ["overview"]`.

### X (Twitter) Player Card

Set `twitterPlayer` to let posts play the deck inline. The card points at the deck's `embed` route, so enable `embed` too; hono-decks then allows X's origins in that route's `frame-ancestors`. The player must be served over HTTPS.

~~~ts
createDecks({
  embed: {},
  viewer: { openGraph: { twitterPlayer: true } }, // or { width: 1280, height: 720 }
});
~~~

X no longer publishes Player Card documentation, so behavior can change. In a [public test from October 2026](https://thehouse.game/updates/2026-10-22-interactive-x-embeds), regular posts played the embed inline on the web without any approval step, X's mobile apps opened the embed URL in a web view instead, and X Articles did not run the player. Keep `ogImage` meaningful for clients that show only the image. X caches cards per URL; after changing tags, share a new URL (for example with a query string) to see the update.

## Public entries

- <code>hono-decks</code>: build config, runtime option types, deck authoring, viewer and embed customization, and source decorators
- <code>hono-decks/advanced</code>: Worker-safe <code>configureDecks()</code>, <code>decksRouter()</code>, <code>deckContext()</code>, raw renderers, and other low-level pipeline APIs
- <code>hono-decks/client</code>: browser hydration
- <code>hono-decks/node</code>: the Node-only compiler, config loader, and filesystem adapter
- <code>hono-decks/honox</code>: shared HonoX route composition and conflict checks; no HonoX dependency is required by Hono-only apps
- <code>hono-decks/vite</code>: Vite integration that compiles and watches decks during development
- <code>hono-decks/cli</code>: the programmatic CLI runner

The generated workflow normally imports only the root entry. Use <code>hono-decks/advanced</code> only when assembling a custom <code>DeckSource</code> or router from the lower-level primitives.

## Cloudflare Workers

Use a JSONC Wrangler config, a current compatibility date, and <code>nodejs_compat</code> when required. Generate binding types with <code>wrangler types</code> so handwritten environment types cannot drift from the deployed configuration.

~~~jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "my-decks",
  "main": "src/index.ts",
  "compatibility_date": "2026-07-14",
  "compatibility_flags": ["nodejs_compat"]
}
~~~

## Advanced API

Use the advanced entry only when building a custom runtime from an existing manifest, database, or remote object store.

~~~ts
import { decksRouter, manifestDeckSource } from "hono-decks/advanced";

const source = manifestDeckSource(manifest);
app.route("/internal-slides", decksRouter({ source, dev: true }));
~~~

At this level, the application owns the mount path, source policy, and option merging. <code>configureDecks({ mountPath, decks }, options)</code> returns the same API as the generated <code>createDecks()</code> for compiled data you load yourself. For normal use, the generated <code>createDecks()</code> is shorter and safer.

## Examples

- <code>examples/minimal</code>: the smallest standalone Worker setup
- <code>examples/basic</code>: R2, Browser Rendering, custom routes, and client components
- <code>examples/honox</code>: HonoX integration through <code>virtual:hono-decks/honox</code>

## Void Hono Markdown

Set `build.markdown: "void"` in `hono-decks.config.ts` to opt into `.md` decks
alongside MDX. This requires `void-plugin-hono-jsx@^0.9.1` with its standalone compiler and client exports.
See the [Void consumer fixture](https://github.com/ts-76/hono-decks/tree/main/fixtures/void-markdown)
for package verification, Void middleware hosting, supported syntax and limitations.

## Node build results and failure recovery

`compileDecks()` returns `CompileDecksResult`, containing `outDir`,
`routerModulePath` and deck build summaries. Each slide summary includes its
`modulePath` and metadata. This result is not a renderable `DeckManifest`.
Import `createDecks()` from the generated `decks.ts` for runtime routing.
Custom build scripts reading titles, warnings, assets or notes can continue
using `result.decks`; to serve compiled data, use the generated module.

Synchronous renderers execute synchronous slide render functions and reject
async bodies with guidance to use the async renderer. Both renderers reject
build summaries without a renderable body instead of silently producing empty
slides.

The compiler completes slide generation, client bundling and OGP-cache
serialization before publishing. It stages all files and restores overwritten
files (including cache files) on a publication error. Application-owned files
are preserved. This guarantees rollback on reported build failure, not
crash-atomic publication or coordination between concurrent compiler processes.
If rollback itself fails, the error lists retained recovery directories.

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

Set `duration: 20m` in deck frontmatter for a target (also `1h30m`, `90s`, or a number of minutes). Override it with `createDecks({ presenter: { duration: 1200 } })`, in seconds, or use the same string syntax. The timer starts on navigation or with Start; press `T` to start or pause it. Reset clears it. Type a target in minutes next to the timer controls to set or change it for that presenter tab (it overrides the configured duration, survives reloads, and is relayed to the remote); clear the field to remove it. The presenter tab retains its elapsed and paused state across reloads. With a target, the timer also shows the remaining time and your pace: each slide gets an equal share of the duration, and the timer says whether you are on pace, ahead, or behind that share.

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

The remote page is built for one-handed use on a phone: speaker notes fill the screen, a large Next button sits in the thumb zone beside Previous and a slide list for jumping anywhere, and the header shows the connection, position, elapsed time, and, with a talk duration, the remaining time and pace. The timer follows the presenter page's talk timer (start, pause, and reset it there). Time is read through the Temporal API (`Temporal.Now`) where available and falls back to `Date.now()`; in Workers, enable it with the `temporal` compatibility flag (on by default from compatibility date 2026-12-01). Each device only measures durations on its own clock, so clock differences between the presenter, the room, and the phone do not affect the display. While visible, the remote keeps the screen awake with the Screen Wake Lock API and vibrates briefly on taps where supported.

The presenter toolbar shows a **QR** button. It opens a QR code and a link for the absolute `/:slug/remote` URL (keeping query parameters such as `lang`), so a phone can open the remote control by scanning it. The phone must pass the same presenter authorization; for cookie-based sign-in, return a short-lived signed link from `remote.url({ c, slug, url })`. The same hook can swap the host for a LAN address or tunnel during development, because a phone cannot reach `localhost`.

Rooms use the WebSocket Hibernation API, so an idle room is evicted from memory and incurs no duration charges. The only stored data is the current position. When the last connection closes, the room schedules an alarm; if nobody reconnects within an hour, it deletes all of its storage, leaving nothing behind. Change the timeout by subclassing (`class Room extends DeckRemoteRoom { idleTimeoutMs = 10 * 60 * 1000 }`). A room with no stored position adopts the first presenter's slide instead of resetting the talk to slide 1.

Authorization is required on every WebSocket connection. Presenter access grants control; follower access grants live position only. The remote page includes speaker notes and requires presenter authorization; the socket carries only positions and commands. Messages are validated, capped at 1 KB, and rate-limited per socket. The socket route rejects cross-origin browser requests. Protect the presenter and other routes that expose notes separately; remote authorization does not protect the whole deck. Use HTTPS, secure session cookies, and `Cache-Control: no-store` for authenticated content. Include `wss:` or `ws:` as appropriate in CSP `connect-src` (same-origin WebSockets can be covered by `'self'`, depending on browser support). See the remote recipe for the binding, migration, and authorization example.


The viewer supports Left / Right, Page Up / Page Down, Space / Shift + Space, Home, and End for navigation. Press `F` for fullscreen, `O` for the overview when enabled, `T` for the table of contents, and `?` for shortcut help. The table of contents button opens a slide list; Escape closes the panel or help. Controls hide after about 2.5 seconds of inactivity over the slide and reappear on activity. Set `viewer.controls.autoHide: false` to keep them visible.

## UI language and messages

Built-in UI uses the resolved document language (`document.lang`, including surface overrides; the default is `ja`). Japanese language tags such as `ja-JP` use Japanese; other languages use English. Override individual messages per locale in runtime options:

```ts
createDecks({
  document: { lang: "ja" },
  messages: { ja: { previous: "戻る" }, en: { previous: "Back" } },
});
```

Templates such as `slidePosition` and `progressText` accept `{current}` and `{total}`; `slideCount` and `slideCountOne` accept `{count}`. Existing `viewer.controls.labels` take precedence for viewer controls. `DeckMessages`, `resolveMessages`, and `formatMessage` are exported for custom surfaces.
