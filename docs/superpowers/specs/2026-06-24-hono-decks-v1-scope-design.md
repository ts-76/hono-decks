# Hono Decks V1 Scope Design

## Summary

`@hono/decks` V1 is a Hono-first package for publishing and serving MDX slide decks on Cloudflare Workers and compatible Hono runtimes. The V1 product promise is:

> Write decks as MDX, compile them into Worker-safe generated modules, mount a Hono router, and get stable deck index, viewer, render, print, asset, custom page, and opt-in export behavior.

V1 is not a full presentation operations platform. It should stay focused on publishing and delivery, with clear extension points for application-owned runtime policy.

## Goals

- Provide a stable app-owned facade flow through `hono-decks init`, `hono-decks compile`, generated deck modules, `defineDecks()`, and `decksRouter()`.
- Serve generated decks through a predictable Hono route surface.
- Keep runtime rendering Worker-safe by avoiding production filesystem access and raw MDX evaluation.
- Support practical authoring features: MDX, deck-local server components, client islands, local assets, deck-local CSS, transitions, fragments, embeds, and code blocks.
- Support application-owned customization through `defineDecksConfig()`, `DeckSource`, `deckContext()`, viewer controls options, router extensions, and route-level options.
- Support R2-backed asset delivery without owning R2 upload, cache rules, or purge workflows.
- Support print and Browser Run PDF/PNG export as opt-in delivery features.
- Keep official examples small but representative, with package tests plus Worker sample coverage for V1 behavior.

## Non-Goals

- R2 object upload, sync, deletion, purge, cache rule management, or Cloudflare account orchestration.
- Official CMS, D1, KV, GitHub, or database-backed `DeckSource` implementations beyond the core interface.
- Presenter view, speaker window sync, remote control, share/QR tooling, or presentation-session management.
- Visual editor, agent editing routes, proposal/apply workflows, or deck management UI.
- OGP image generation or social sharing route generation.
- Per-slide draft semantics. V1 only commits to deck-level draft filtering.
- Advanced authoring convenience such as code block copy UI unless it is already covered by the core renderer.

## Public API

V1 should treat the following as core public surfaces:

- `defineDecks()`
- `defineDecksConfig()`
- `decksRouter()`
- `deckContext()`
- `createDeckViewerParts()`
- `manifestDeckSource()`
- `withR2Assets()`
- Browser export options and binding types
- Viewer controls options and item types
- Core runtime model types such as `CompiledDeck`, `DeckEntry`, `DeckManifest`, `DeckSource`, and `AssetRef`
- Node-side compile CLI and generated module contract

The public export surface should be audited before release so every type that appears in a public signature is exported from the appropriate package entrypoints.

## Route Surface

The standard router should provide these routes under the configured mount path:

- `GET /` for the deck index.
- `GET /:slug` for the viewer shell.
- `GET /:slug/render` for the iframe-owned presentation document.
- `GET /:slug/print` for print and PDF-oriented rendering.
- `GET /:slug/assets/*` for generated asset delivery.
- `GET /_assets/client.js` when a generated client island bundle exists.
- `GET /:slug/export.pdf` and `GET /:slug/export.png` only when Browser Run export is explicitly enabled.

The router owns the standard public deck experience. Applications own custom pages, additional routes, auth policy, layout wrappers, and deployment-specific headers.

## Authoring Features

V1 authoring should include:

- Directory decks and single-file decks.
- Deck and slide frontmatter with typed known fields, preserved unknown `meta`, and clear warnings.
- MDX expressions as trusted app code compiled at build time.
- Deck-local server components from `components/index.tsx` or `components/index.ts`.
- Deck-local client islands from `components/client/index.tsx`.
- Deck-local CSS or theme style entries.
- Local image assets rewritten to generated public asset URLs.
- Remote URLs preserved as remote URLs.
- Shorthand embeds and built-in components already demonstrated in the basic example.
- Code blocks and build-time syntax highlighting already covered by package and sample tests.
- Transitions, fragments, keyboard navigation, touch navigation, and fullscreen behavior already covered by runtime tests and smoke checks.

Single-file decks should continue to reject local relative assets because they do not have an implicit asset directory.

## Asset Delivery

V1 asset delivery is centered on `DeckSource.getAsset()`.

Generated local assets are served through `/:slug/assets/*`. `withR2Assets()` can wrap a generated `DeckSource` and attempt to read matching assets from an R2 binding before falling back to the original source. By default, the generated asset `sourcePath` is used as the R2 key, with `keyPrefix` and `key(input)` available for application-owned key mapping.

R2-backed delivery is part of V1. R2 upload is not. Deployment pipelines must place objects in the bucket before relying on R2-backed responses.

The package may set response headers such as `content-type` and configured `cache-control`, but Cloudflare edge cache behavior remains deployment policy. Deployed smoke checks should observe headers such as `cf-cache-status` and `age` when available without making them package-level invariants.

## Viewer Customization

The standard viewer should be useful without configuration and customizable without forcing a full render override.

V1 viewer customization includes:

- `viewer.head` for adding viewer shell head content.
- `viewer.style` for last-mile viewer shell CSS.
- `viewer.render` for full shell override.
- `viewer.controls: false` to hide controls.
- `viewer.controls` diff options for common changes:
  - `className`
  - `itemClassName`
  - `attributes`
  - `ariaLabel`
  - `hidden`
  - `labels`
  - `before`
  - `after`
- `viewer.controls.items(defaults, context)` as a full controls item override.
- `viewer.controls.renderItem` and `{ type: "render" }` as JSX escape hatches.

The default control semantics should remain renderer-owned. Consumers should not need to know internal `data-action`, export, position, or back-link attributes to preserve standard behavior.

## Export

V1 export is an opt-in delivery feature, not a mandatory runtime dependency.

When configured, Browser Run export should:

- Use the existing `/:slug/print` route as the PDF/PNG source.
- Expose PDF and PNG routes only for enabled formats.
- Respect `export.authorize`.
- Add PDF/PNG viewer controls only when export paths are authorized for that request.
- Return clear disabled, unauthorized, and binding-missing responses.

The package should not own long-running job management, export queues, file storage, email delivery, or batch export workflows in V1.

## Custom Pages

Applications can use `deckContext()` to build custom details, embed, or site-owned pages while reusing the generated `DeckSource` and viewer parts.

`deckContext()` should stay focused on loading deck context and standard viewer parts. It should not automatically perform export authorization for custom pages. If a custom page needs export controls, the application should either pass authorized `exportPaths` to `createDeckViewerParts()` or build its own app-owned links.

This boundary keeps standard routes predictable while allowing app pages to own auth, layout, metadata, and navigation.

## Worker Runtime Boundary

V1 should preserve the existing Worker runtime boundary:

- Build-time tooling may read local files, compile MDX, bundle client islands, and generate modules.
- Worker runtime imports generated modules and serves requests.
- Production runtime should not depend on filesystem access.
- Production runtime should not evaluate raw MDX strings.
- Node-specific APIs should remain behind node entrypoints or CLI paths.

This boundary is a key part of making the package reliable on Cloudflare Workers.

## Examples And Verification

The basic example should demonstrate the V1 surface without becoming a platform sample:

- Generated facade plus optional `decks.config.ts`.
- Standard deck index and viewer.
- Custom details and embed pages.
- Local assets, remote assets, and R2-backed delivery.
- Server components and client islands.
- Code, media, motion, embeds, transitions, and fragments.
- Viewer controls customization.
- Opt-in Browser Run export.

Verification should include:

- Package unit tests for core contracts.
- Basic Worker sample tests for integration behavior.
- `bun run check` as the repo-wide gate.
- Browser viewport smoke for visual framing, responsiveness, and interaction.
- PDF smoke for print/export output.
- Deployed R2 smoke for deployed cache observations.

## Release Checklist

Before V1, confirm:

- Public entrypoints export every type used in public signatures.
- README separates quick start, app-owned facade, config, custom pages, assets, controls, and export clearly.
- `docs/verification-matrix.md` has no V1-critical `design` gaps.
- R2 docs clearly say delivery is supported and upload is a deployment concern.
- Standard router behavior and custom page behavior are documented separately.
- Example config demonstrates optional extensions without making the common path feel heavy.
- `bun run check` passes.
- Smoke docs describe the commands and deployment prerequisites needed for release validation.

