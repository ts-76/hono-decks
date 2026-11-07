# Basic Hono example

This example is the broad integration reference for `hono-decks`. It mounts the generated deck router in a Hono Worker and demonstrates four decks, custom Hono pages, bilingual navigation, deck-local CSS, server components, client islands, R2-backed assets, external embeds, presenter mode, and Browser Run export.

## Run locally

From the repository root:

```bash
bun install --frozen-lockfile
bun run --cwd examples/basic dev
```

Open these routes after cf starts:

- `/` — application home page
- `/decks` — the deck index
- `/decks/sample` — the main integration deck
- `/decks/sample/about` — a custom Hono route using `decks.context()`
- `/decks/sample/presentation` — the projection view
- `/decks/sample/print` — the print surface
- `/decks/sample/embed` — the opt-in external embed document

Use `?lang=ja` or `?lang=en` to switch the application and deck surfaces between Japanese and English.

## Optional bindings

The development mode in `cloudflare.config.ts` declares the bindings used by the sample:

- `DECK_ASSETS` — R2 bucket for generated assets; assets fall back to embedded responses when the binding is unavailable.
- `BROWSER` — Cloudflare Browser Rendering for PDF and PNG export.
- `DECK_EXPORT_TOKEN` — bearer token required by the export routes.
- `DECK_EMBED_ALLOWED_ORIGINS` — origins allowed by the embed route's `frame-ancestors` policy.
- `DECK_PRESENTER_ENABLED` — enables the presenter route outside development.

Store secrets through `cf workers secrets update` using its documented input options. Keep tokens out of source configuration and shell history. The configuration declares binding names, not secret values.

The production config is an example deployment configuration. Replace its account, domain, and resource names with values owned by your Cloudflare account before deploying. Add the `DECK_ASSETS` R2 binding to the production config when the deployed sample should exercise R2 rather than embedded assets.

## Local smoke checks

The example includes browser-level checks for the surfaces that unit tests cannot fully cover:

```bash
bun run --cwd examples/basic smoke:viewport
bun run --cwd examples/basic smoke:pdf
```

The viewport check covers desktop and mobile layouts, keyboard and touch navigation, motion steps, assets, and the external embed. The PDF check validates generated page counts and rendered previews. Both require the `agent-browser` Chromium binary; PDF preview validation also needs Poppler or macOS Quick Look.

The local PDF check renders the `/print` surface and does not exercise the production `/export.pdf` route or Cloudflare Browser Run. To test the deployed export path, set `HONO_DECKS_BROWSER_RUN_ORIGIN` and `HONO_DECKS_BROWSER_RUN_TOKEN`, then run `bun run --cwd examples/basic smoke:browser-run`. This requires a deployed or remote-bound Worker.

The repository's manual `Browser Run smoke` workflow reads the origin and token from the protected `browser-run-smoke` environment and stores the returned PDFs as artifacts. The basic Worker wires this route to the `BROWSER` binding; the smoke validates the deployed `/export.pdf` behavior rather than identifying the internal binding.

## What to inspect

- `decks/config.ts` — build-only settings (mount path, deck root, output directory)
- `decks/index.ts` — runtime options passed to the generated `createDecks()`
- `src/index.ts` — normal Hono routes alongside `app.route(decks.mountPath, decks.router())`
- `decks/*/components` — server components and browser islands
- `test/worker-sample.test.ts` — route, security, R2, embed, presenter, locale, and export expectations

## cf configuration

Use `cf dev`, `cf build`, and `cf deploy`. Use `cf deploy --mode production` only for the maintained public sample. `cloudflare.config.ts` owns the Worker, production account/domain, and bindings. `wrangler.config.ts` configures the bundler delegated to by cf, including the deck compilation watcher. The ignored `.hono-decks/` cache is recreated automatically; app-owned settings live in `decks/index.ts` and import `#decks`.

The current cf Wrangler backend rebuilds the local Worker on source changes but does not accept the old `--live-reload` flag. Refresh the browser after edits; Vite integrations retain their existing live updates.
