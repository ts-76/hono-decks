# hono-decks

English | [日本語](https://github.com/ts-76/hono-decks/blob/main/packages/decks/README.ja.md)

hono-decks serves MDX slide decks from Hono applications and Cloudflare Workers. It compiles MDX into TypeScript modules at build time, so the Worker runtime does not load the filesystem or the compiler.

## Hono + Vite / HonoX: connect with init

Install hono-decks in an existing app and choose its integration:

~~~sh
npm install hono-decks

# Hono + Vite
npx hono-decks init --framework hono

# Use this instead for HonoX
npx hono-decks init --framework honox

# Keep using the app's existing commands
npm run dev
npm run build
~~~

Both modes preserve the existing Vite config while adding automatic compilation,
create `hono-decks.config.ts`, `src/decks.ts`, and a sample
`decks/welcome/deck.mdx`. Generated code stays in Vite virtual modules and is not written to disk.
Normal `dev` and `build` work from a checkout without generated files. There is
no manual `compile` step or package script change. Neither mode needs the Void adapter.

| Mode | Application connection |
| --- | --- |
| `--framework hono` | Adds the router to the existing Hono entry, preserving its middleware and routes |
| `--framework honox` | Adds a config-driven route to `createApp()`, preserving its options, pages, and middleware |

Open `/slides/welcome`. Init chooses another sample name if an existing deck has
that slug. Existing MDX decks, components, and images remain supported.

Hono init detects a single `src/index.ts`, `.tsx`, `.js`, `.mts`, `.mjs`, or
`src/app.ts`, `.tsx`, `.js` candidate. Use `--entry src/server.ts` for a custom
entry or multiple candidates. Automatic connection supports a default-exported
`const app = new Hono()`. It leaves files unchanged and explains manual mounting
when earlier catch-all/dynamic routes or another app shape prevent a safe edit.

HonoX init supports the standard `app/routes` layout and a default-exported
`createApp()` call in `app/server.ts`. It creates `src/honox-decks.ts` and wraps
the existing createApp options. The helper adds the deck route through the public
HonoX `ROUTES` API, so **changing `mountPath` alone changes the public path**.
There is no route directory to create or rename. Conflicts with existing routes
are errors. A mount change during development automatically restarts Vite after
compilation so route registrations switch together.
The generated HonoX file owns only `import.meta.glob` route discovery and a
call to `withHonoXDecks()` from `hono-decks/honox`. Route composition and conflict
checks are supplied by the package, including dynamic and catch-all conflicts.
Package updates therefore update this behavior without regenerating app code.
Custom `createApp()` options, middleware, and explicit `ROUTES` are preserved.
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

This integration requires `void-plugin-hono-jsx@^0.4.0` or a compatible adapter
with the `/markdown/compiler` and `/markdown/client` exports. `--install` selects
the supported adapter range. Without `--install`, also install the optional Markdown peers:
`markdown-exit@^1.3.0 yaml@^2.9.1 markdown-it-container@^4.0.0 shiki@^4.5.0 @shikijs/transformers@^4.5.0`.
The verified host versions are Void 1.1.11, Vite 8.3.4, and Hono 4.13.13.

`--install` selects npm/pnpm/Yarn/Bun from packageManager or lockfiles and installs
missing dependencies. Incompatible installed versions require an explicit update;
existing scripts are preserved. Yarn requires its node_modules linker; use manual
installation for PnP. Omit `--install` to manage dependencies yourself. To use a local adapter build, pass `--adapter /absolute/path/void-plugin-hono-jsx.tgz`.
Conflicting app files are checked before installation. Installation failures do not
write integration files; dependency and lockfile changes may remain.

`init --framework void` wraps the default export in the existing root
`vite.config.*` with `withHonoDecks()` and creates:

- `hono-decks.config.ts`: `/slides` mount, `decks` source directory, Hono Markdown enabled
- `src/decks.ts`: the app-owned facade
- `middleware/hono-decks.ts`: complete slide subtree routing, Markdown CSS, and dev reload support
- `decks/welcome/deck.md` and `Counter.tsx`: an interactive two-slide sample at `/slides/welcome`

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
`--out` and `--generated` apply only to the generic init below.

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
an app-owned `src/decks.ts` facade connected to it:

~~~ts
/// <reference types="hono-decks/vite-env" />
import { decks } from "virtual:hono-decks";

export { decks };
~~~

`decks` is configured with `hono-decks.config.ts`; its `router()`, `paths()`, and
other runtime APIs remain unchanged. The virtual module also exports
`createDecks(config)` when another configured kit is needed. Bundled ambient types
allow typechecking before the first dev or build run.

Edit sources, images, components, and themes under `decks/`, plus your config.
Vite reads compiled code from an in-memory module map and bundles it into the
application. There is no `src/generated` directory to create or import and no
need to set `build.outDir`. An explicitly configured OGP metadata cache is still
written to disk. Imported config inputs (for example a separate mount-path
settings file) are also watched. Init uses Vite's `BASE_URL` for its development
client script. If the host's dev server intercepts Vite URLs, keep its existing
asset exclusions configured for the chosen base.

Existing Vite facades that import their configured generated path also resolve
through the virtual graph, including `.js` imports that previously resolved to
generated TypeScript files. Prefer the stable entry above for new integrations.

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

<code>init</code> creates two files without overwriting existing files:

- <code>hono-decks.config.ts</code>: the shared configuration for the CLI and runtime
- <code>src/decks.ts</code>: an editable facade that connects the generated modules to your application

~~~ts
// hono-decks.config.ts
import { defineDecksConfig } from "hono-decks";

export default defineDecksConfig({
  mountPath: "/decks",
  build: {
    root: "decks",
    outDir: "src/generated",
  },
});
~~~

~~~ts
// src/decks.ts
import config from "../hono-decks.config";
import { createDecks } from "./generated/decks";

export const decks = createDecks(config);
~~~

~~~ts
// src/index.ts
import { Hono } from "hono";
import { decks } from "./decks";

const app = new Hono();
app.get("/", (c) => c.redirect(decks.paths("welcome").viewer));
app.route(decks.mountPath, decks.router());
export default app;
~~~

Create <code>decks/welcome/deck.mdx</code>, then run <code>bunx hono-decks compile</code>. The command updates <code>src/generated/decks.ts</code> and the generated slide modules. Do not edit the generated directory directly.

## One config, one runtime kit

You do not need to repeat the mount path across compiler options, <code>app.route()</code>, and asset URLs. Define <code>mountPath</code> once in the config. The generated <code>createDecks(config)</code> function returns a configured kit:

- <code>decks.mountPath</code>: the normalized path to pass to <code>app.route()</code>
- <code>decks.source</code>: the <code>DeckSource</code> after applying the config's <code>source()</code> decorator
- <code>decks.router(overrides?)</code>: a router that safely deep-merges config and call-site overrides
- <code>decks.context(overrides?)</code>: middleware for application-owned routes
- <code>decks.paths(slug)</code>: the complete route map for the viewer, renderer, print view, presentation views, embeds, exports, OGP image, and assets

~~~ts
const paths = decks.paths("product");
paths.viewer;       // /decks/product
paths.render;       // /decks/product/render
paths.print;        // /decks/product/print
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
export default defineDecksConfig({
  mountPath: "/decks",
  router: {
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

The plugin compiles before Vite starts and adds the deck root and <code>hono-decks.config.ts</code> to the Vite watcher. After a successful recompile, it requests a full browser reload. In both setups, the application's normal <code>dev</code> command is enough for authoring.

## Runtime configuration

Every resolver receives one object argument. Callbacks remain readable as inputs are added because their meaning does not depend on positional parameters.

~~~ts
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
        c.req.header("authorization") === "Bearer " + c.env.DECK_EXPORT_TOKEN,
      browser: ({ c }) => c.env.BROWSER,
      pdf: true,
      png: true,
    },
  },
});
~~~

When <code>dev</code> is omitted, hono-decks uses the <code>NODE_ENV</code> value supplied by Vite or Wrangler. The standard Vite and <code>wrangler dev</code> commands are treated as development, while production builds and <code>wrangler deploy</code> are treated as production. An explicit <code>dev: false</code> value or resolver takes precedence. Unknown environments fail closed as production.

Use <code>decks.router({ viewer: ... })</code> for call-site overrides. Nested options for viewer controls, document surfaces, the presenter, embeds, and exports are merged without discarding the config. Disable a feature explicitly with values such as <code>presenter: false</code>, <code>embed: false</code>, or <code>export: false</code>.

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

## Embedding

Use <code>createDeckViewerEmbed()</code> to embed multiple decks into the same document. This high-level helper builds an iframe viewer, controls, and a table of contents from a <code>CompiledDeck</code> already loaded by the application.

When embedding from an external blog, enable <code>router.embed</code> and list the allowed parent origins in <code>frameAncestors</code>. Iframe navigation does not require CORS, but it does require an appropriate CSP <code>frame-ancestors</code> directive.

~~~ts
router: {
  embed: {
    frameAncestors: ["https://blog.example.com"],
    robots: false,
  },
}
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

Enable <code>router.viewer.openGraph</code> when generating share images at build time. The default image path is <code>decks.paths(slug).ogImage</code>. The viewer derives absolute Open Graph and Twitter Card URLs from the request origin.

~~~ts
export default defineDecksConfig({
  mountPath: "/decks",
  router: {
    viewer: { openGraph: true },
  },
});
~~~

Override <code>imagePath</code> with a resolver when images are served from a separate CDN. Set Open Graph configuration to <code>false</code>, or omit it, to suppress social metadata.

Image generation is intentionally not part of the core package. The <code>examples/ogp</code> recipe uses the deck metadata returned by <code>compileDecks()</code> from <code>hono-decks/node</code> to Satori and resvg, then stores 1200 by 630 PNG files in Workers Static Assets. Satori and resvg are example-only dependencies, and the recipe does not require Browser Rendering. Satori accepts TTF, OTF, and WOFF fonts but not WOFF2, so the build script must receive a font file that covers the target language.

<code>build.ogpCacheFile</code> stores external site metadata used by <code>@[card](...)</code>. It is separate from the viewer's share image.

## Public entries

- <code>hono-decks</code>: configuration, configured-kit types, deck authoring, viewer and embed customization, and source decorators
- <code>hono-decks/advanced</code>: <code>defineDecks()</code>, <code>decksRouter()</code>, <code>deckContext()</code>, raw renderers, and other low-level pipeline APIs
- <code>hono-decks/client</code>: browser hydration
- <code>hono-decks/node</code>: the compiler and Node filesystem adapter
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

At this level, the application owns the mount path, source policy, and option merging. For normal use, the generated <code>createDecks(config)</code> API is shorter and safer.

## Examples

- <code>examples/minimal</code>: the smallest standalone Worker setup
- <code>examples/basic</code>: R2, Browser Rendering, custom routes, and client components
- <code>examples/honox</code>: HonoX integration

## Void Hono Markdown

Set `build.markdown: "void"` in `hono-decks.config.ts` to opt into `.md` decks
alongside MDX. This requires `void-plugin-hono-jsx@^0.4.0` with its standalone compiler and client exports.
See the [Void consumer fixture](https://github.com/ts-76/hono-decks/tree/main/fixtures/void-markdown)
for package verification, Void middleware hosting, supported syntax and limitations.

## Node build results and failure recovery

`compileDecks()` returns `CompileDecksResult`, containing `outDir`,
`routerModulePath` and deck build summaries. Each slide summary includes its
`modulePath` and metadata. This result is not a renderable `DeckManifest`.
Import `createDecks()` from the generated `decks.ts` for runtime routing.
Custom build scripts reading titles, warnings, assets or notes can continue
using `result.decks`; code passing the return value into `defineDecks()` must
switch to the generated module.

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
