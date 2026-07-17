# hono-decks

English | [日本語](https://github.com/ts-76/hono-decks/blob/main/packages/decks/README.ja.md)

hono-decks serves MDX slide decks from Hono applications and Cloudflare Workers. It compiles MDX into TypeScript modules at build time, so the Worker runtime does not load the filesystem or the compiler.

## Quick start

The examples below use Bun. npm, pnpm, and Yarn are supported as well.

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

<code>components/index.tsx</code> contains server-side JSX components. <code>components/client/index.tsx</code> contains components hydrated in the browser. <code>theme.css</code> applies only to that deck. Local images are detected during compilation and rewritten to public URLs based on the mount path and deck slug.

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

Image generation is intentionally not part of the core package. The <code>examples/ogp</code> recipe passes the manifest returned by <code>compileDecks()</code> from <code>hono-decks/node</code> to Satori and resvg, then stores 1200 by 630 PNG files in Workers Static Assets. Satori and resvg are example-only dependencies, and the recipe does not require Browser Rendering. Satori accepts TTF, OTF, and WOFF fonts but not WOFF2, so the build script must receive a font file that covers the target language.

<code>build.ogpCacheFile</code> stores external site metadata used by <code>@[card](...)</code>. It is separate from the viewer's share image.

## Public entries

- <code>hono-decks</code>: configuration, configured-kit types, deck authoring, viewer and embed customization, and source decorators
- <code>hono-decks/advanced</code>: <code>defineDecks()</code>, <code>decksRouter()</code>, <code>deckContext()</code>, raw renderers, and other low-level pipeline APIs
- <code>hono-decks/client</code>: browser hydration
- <code>hono-decks/node</code>: the compiler and Node filesystem adapter
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
