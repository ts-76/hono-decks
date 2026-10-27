# Integrating with an application

Use this route when adding hono-decks to an existing Hono, HonoX, Vite, Wrangler, or Cloudflare Workers application, or when configuring application routes, presenter access, or external embedding.

## Preserve the build/runtime boundary

The compiler and `hono-decks/node` use Node filesystem tooling. Run them during development or build, never in the Worker. Vite framework init uses `virtual:hono-decks`; the following generated facade applies to the CLI/file workflow.

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

app.route(decks.mountPath, decks.router());

export default app;
```

## Use the configured kit

- `decks.mountPath`: normalized path for `app.route`
- `decks.source`: configured `DeckSource`
- `decks.router(overrides?)`: built-in viewer, renderer, presenter, embed, export, and asset routes
- `decks.context(overrides?)`: middleware for application-owned deck routes
- `decks.paths(slug)`: viewer, render, print, presentation, presenter, embed, PDF, PNG, OGP, and asset paths

Never rebuild these paths with string concatenation.

## Existing Wrangler application

Merge this into the existing `wrangler.jsonc`:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "main": "src/index.ts",
  "compatibility_date": "2026-07-14",
  "build": {
    "command": "hono-decks compile",
    "watch_dir": ["decks"]
  }
}
```

Keep other bindings, assets, routes, and compatibility flags intact. Run `wrangler types` after changing bindings.

## Existing Vite or HonoX application

Prefer `hono-decks init --framework hono` for an existing Hono + Vite app or
`hono-decks init --framework honox` for HonoX. Init connects routing and adds
automatic compilation while preserving existing settings and scripts. Use
normal `dev`/`build`; no separate compile command is needed. Its facade imports
`decks` from `virtual:hono-decks` and references `hono-decks/vite-env` types.
Vite generates code in memory and needs no output directory. HonoX's generated
file keeps route discovery in the app; `withHonoXDecks()` from `hono-decks/honox`
merges routes, preserves options, and detects static/dynamic/catch-all conflicts.
Config imports are watched, and init respects Vite's `BASE_URL` for the dev client. The CLI/manual
filesystem integration remains available. Use the manual
integration below for unsupported app shapes or an already configured app.

Add the plugin to the existing config rather than replacing other plugins:

```ts
import { honoDecks } from "hono-decks/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [honoDecks()],
});
```

For HonoX, mount the router from a HonoX route module while keeping the generated facade outside the route tree. Follow the application's established catch-all route convention.

## Development updates

In Vite integrations, successful source edits update the presentation in place when island identities can be matched safely, preserving supported state and the current slide/step. Client code edits reload the presentation iframe and reset island state while retaining the viewer and slide/step. Ambiguous identities, unsupported hydration, and update failures also fall back to an iframe reload. Wrangler direct mode uses its own `--live-reload`.

## Application-owned routes

Use `decks.context()` to share deck lookup, draft policy, paths, and viewer configuration:

```ts
import { Hono } from "hono";
import type { DeckContextVariables } from "hono-decks";
import { decks } from "./decks";

const app = new Hono<{ Variables: DeckContextVariables }>();

app.get(
  `${decks.mountPath}/:slug/about`,
  decks.context(),
  (c) => c.json({
    title: c.var.deckMeta.title,
    viewer: c.var.deckMeta.paths.viewer,
    slides: c.var.deckToc,
  }),
);

app.route(decks.mountPath, decks.router());
```

Register more specific application routes before the mounted deck router.

## Presenter policy

Presenter view can contain notes and previews. Enable it intentionally:

```ts
router: {
  presenter: {
    enabled: ({ dev }) => dev,
    viewerControl: true,
  },
}
```

For production, replace the development condition with application authentication or a trusted binding policy.

## External iframe embedding

Enable the embed route and explicitly list allowed parent origins:

```ts
router: {
  embed: {
    frameAncestors: ["https://blog.example.com"],
    robots: false,
  },
}
```

```html
<iframe
  src="https://slides.example.com/decks/product/embed"
  title="Product deck"
  allow="fullscreen"
></iframe>
```

The response writes CSP `frame-ancestors` and removes conflicting `X-Frame-Options`. Invalid origins do not widen access. Do not use CORS headers to solve iframe permission.

Review any application-wide CSP middleware after mounting: it must preserve the embed response's `frame-ancestors` directive and allow the scripts, styles, images, frames, and fonts actually used by the deck.

## Integration verification

- Start the normal application dev command and confirm deck changes recompile and appear.
- Verify direct navigation and application links use `decks.paths`.
- Confirm draft decks are unavailable outside development.
- Test application-owned routes before the deck router catch-all.
- Check presenter notes are not exposed by an unintended production policy.
- Test the external embed from an allowed and a disallowed parent origin.
- Run the deployment dry run so Worker-only bundling errors are caught before publish.
