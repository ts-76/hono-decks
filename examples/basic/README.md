# Basic Hono example

This example is the broad integration reference for `hono-decks`. It mounts the generated deck router in a Hono Worker and demonstrates four decks, custom Hono pages, bilingual navigation, deck-local CSS, server components, client islands, R2-backed assets, external embeds, presenter mode, and Browser Run export.

## Run locally

From the repository root:

```bash
bun install --frozen-lockfile
bun run --cwd examples/basic dev
```

Open these routes after Wrangler starts:

- `/` — application home page
- `/decks` — the deck index
- `/decks/sample` — the main integration deck
- `/decks/sample/about` — a custom Hono route using `decks.context()`
- `/decks/sample/presentation` — the projection view
- `/decks/sample/print` — the print surface
- `/decks/sample/embed` — the opt-in external embed document

Use `?lang=ja` or `?lang=en` to switch the application and deck surfaces between Japanese and English.

## Optional bindings

The local Wrangler config declares the bindings used by the sample:

- `DECK_ASSETS` — R2 bucket for generated assets; assets fall back to embedded responses when the binding is unavailable.
- `BROWSER` — Cloudflare Browser Rendering for PDF and PNG export.
- `DECK_EXPORT_TOKEN` — bearer token required by the export routes.
- `DECK_EMBED_ALLOWED_ORIGINS` — origins allowed by the embed route's `frame-ancestors` policy.
- `DECK_PRESENTER_ENABLED` — enables the presenter route outside development.

Set secrets with Wrangler rather than placing them in `wrangler.jsonc`:

```bash
bunx wrangler secret put DECK_EXPORT_TOKEN
bunx wrangler secret put DECK_EMBED_ALLOWED_ORIGINS
```

The production config is an example deployment configuration. Replace its account, domain, and resource names with values owned by your Cloudflare account before deploying. Add the `DECK_ASSETS` R2 binding to the production config when the deployed sample should exercise R2 rather than embedded assets.

## What to inspect

- `hono-decks.config.ts` — one config shared by compilation and runtime routing
- `src/decks.ts` — the application-owned generated-module facade
- `src/index.ts` — normal Hono routes alongside `app.route(decks.mountPath, decks.router())`
- `decks/*/components` — server components and browser islands
- `test/worker-sample.test.ts` — route, security, R2, embed, presenter, locale, and export expectations
