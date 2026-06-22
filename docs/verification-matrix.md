# Verification Matrix

This document tracks the sample and package-level verification cases that should exist before `@hono/decks` is treated as a general slide system. The goal is to keep the official examples small but representative: each feature should have at least one package test and, when useful, one Worker sample route or deck.

For the recommended implementation order, see [Verification Priorities](./verification-priorities.md).

Status:

- `done`: covered by current package or sample tests.
- `sample`: should be demonstrated in `examples/basic` or another official example.
- `design`: needs an API or runtime decision before implementation.
- `smoke`: needs deployed Worker or browser verification in addition to unit tests.

## Media And Assets

| Area | Case | Status | Notes |
| --- | --- | --- | --- |
| Local image asset | Markdown image: `![Alt](./assets/image.png)` | done | Directory deck assets are generated into `/decks/:slug/assets/*`; regression coverage should keep public URL rewriting idempotent. |
| Local image asset | JSX image: `<img src="./assets/image.png" />` | done | `examples/basic/decks/media` and node adapter tests cover MDX JSX compile output and public URL rewriting. |
| Local image asset | Bare `assets/image.png` without `./` | done | Covered by generator rewrite behavior; keep this idempotent. |
| Remote image asset | `https://...` remains unchanged | done | Node adapter tests verify remote URLs remain normal remote URLs and are not rewritten to local asset paths. |
| R2 public URL | Custom domain or `r2.dev` URL used directly | design | Treat as remote URL unless an explicit R2 asset policy is introduced. Decide whether this belongs in the official sample. |
| R2 binding delivery | Local asset path served from R2 with cache headers | done | `withR2Assets()` supports a pre-existing object using the generated `sourcePath` as the R2 key and falls back to embedded local assets when the binding is missing. `examples/basic/decks/media` includes an R2-backed image sample. |
| Asset cache headers | Long-lived cache for R2-backed assets | done | Local tests assert `Cache-Control`; Cloudflare edge cache hit/miss needs deployed smoke verification. |
| Asset cache headers | `cf-cache-status` / `age` on deployed Worker | smoke | Requires deployment. `examples/basic` includes `smoke:r2-cache` for the deployed URL; local Miniflare-style tests can only check route behavior and headers. |

R2 official sample direction is still open. The current package API supports binding-backed delivery because it proves the Worker integration and cache headers without requiring an upload command. A public URL example is simpler for users, but it does not exercise `DeckSource.getAsset()` or Worker cache behavior.

## Embeds

| Area | Case | Status | Notes |
| --- | --- | --- | --- |
| YouTube | `@[youtube](https://...)` shorthand | done | Build-time syntax transform compiles the Zenn-style shorthand to built-in `EmbedFrame`; sample tests verify `title`, `loading="lazy"`, sandbox, fallback link, and default permissions. |
| X / SNS embed | `@[x](https://...)` shorthand | done | Build-time syntax transform compiles the shorthand to built-in `TweetEmbed`, which emits official `twitter-tweet` markup and the X widgets script. Low-level `SocialEmbed` remains available for script-free fallback use. |
| Link card | `@[card](https://...)` shorthand | done | Build-time syntax transform compiles the shorthand to built-in `LinkCard`; OGP metadata is resolved at compile time on a best-effort basis and falls back to a URL card when unavailable. |
| Plain URL | Single-line `https://...` | done | Single-line URLs become normal text links and do not auto-card. Authors opt into card/embed presentation with explicit shorthand. |
| Generic embed shorthand | `@[embed](https://...)` / `@[iframe](https://...)` | done | Build-time syntax transform compiles generic embed shorthand to built-in `EmbedFrame`; low-level `<EmbedFrame>` remains available for custom aspect ratio and permissions. |
| Generic iframe | `<EmbedFrame src title />` or similar component | done | Built-in `EmbedFrame` centralizes `sandbox`, `allow`, `referrerpolicy`, aspect ratio, lazy loading, and fallback link defaults. |
| CSP | Embed-safe policy for standard viewer | done | README documents that the package does not set CSP headers; apps own `frame-src`, `img-src`, and `script-src`, especially when opting into third-party SNS scripts. |
| Sandbox | Safe defaults for embedded content | done | `EmbedFrame` defaults to `allow-scripts allow-same-origin allow-presentation allow-popups`; callers can override `sandbox` or disable it with `sandbox={false}`. |
| Fallback | Loading and blocked-content fallback UI | done | `EmbedFrame` renders a visible fallback link below the iframe. |

## Code Blocks

| Area | Case | Status | Notes |
| --- | --- | --- | --- |
| Markdown fenced code | Triple-backtick code block | done | `examples/basic/decks/code` verifies language classes, HTML escaping, and overflow-oriented default presentation styles. |
| MDX component code block | `<CodeBlock lang="ts">...</CodeBlock>` | done | Built-in `CodeBlock` accepts text children with `lang`, `filename`, and `highlight`; package and sample tests cover stable metadata and escaping. |
| Syntax highlighting | Build-time Shiki or equivalent | done | Shiki runs during CLI/module generation; generated slide modules carry highlighted HTML and Worker-safe runtime exports do not import Shiki. |
| Copy UI | Copy button or line highlight controls | design | Optional; should not be required for the core renderer. |

## Animation And Navigation

| Area | Case | Status | Notes |
| --- | --- | --- | --- |
| In-slide CSS animation | CSS animation in slide content | done | `examples/basic/decks/motion` covers CSS animation, `prefers-reduced-motion`, and viewport smoke coverage. |
| In-slide client animation | `hono/jsx/dom` island animation | done | `examples/basic/decks/motion` covers a deck-local client island animation component and generated client registry wiring. |
| Slide transition | `transition` frontmatter | done | Known transition values are typed, validated during module generation, emitted as `data-transition`, and covered by package/sample tests. |
| Fragment / step display | Progressive reveal for bullets or blocks | done | Explicit `<Fragment />`, `fragments: list`, `:::fire`, `$fire`, iframe-owned step state, slide-only default controls, and fragment progression smoke are covered by package/sample tests. |
| Fire effects | `effect="fade-up"` / `effect="scale"` | done | Fire authoring props are stripped from rendered components and emitted as `data-fire-effect` on fragment wrappers with reduced-motion-safe CSS hooks. |
| Keyboard navigation | Arrow keys, space, fullscreen | done | Current viewer/render scripts cover the core path; keep route tests and add browser smoke later. |
| Touch navigation | Tap/swipe on mobile | done | Package tests cover pointer swipe command wiring; `bun run smoke:viewport` verifies browser-side pointer swipe dispatch. Real device touch can still be manually checked before release. |

## Presentation And Export

| Area | Case | Status | Notes |
| --- | --- | --- | --- |
| Presenter notes | `notes` frontmatter or slide notes block | design | Model exists partially; speaker-view behavior still needs an API and route. |
| Speaker view | Separate presenter route/window | design | Needs state sync with the main presentation and clear public/private route boundaries. |
| Print view | Browser print stylesheet | done | Package tests assert a dedicated `/:slug/print` page with an A4 portrait handout stylesheet, margins, 3-up slide grouping, and all fragments visible. |
| PDF export | Print-to-PDF compatible output | smoke | `examples/basic` includes `smoke:pdf`, which starts `wrangler dev`, saves sample/media/motion print pages to PDF, checks A4 handout page counts, and renders first-page PNG previews with Poppler or Quick Look. Final visual approval remains a release checklist item. |
| Browser Run export | Opt-in Worker PDF/PNG routes | done | `decksRouter({ export })` can expose `/:slug/export.pdf` and `/:slug/export.png` using Cloudflare Browser Run `quickAction()` against the existing `/:slug/print` layout. Package tests cover payloads, download headers, viewer links, and disabled-by-default behavior. |
| Theme switching | Deck-level theme | done | `DeckTheme` now supports trusted `style`, `components`, and `layouts`; route `style` applies after `theme.style`, while `viewer.head` stays viewer-shell only. |
| Layout switching | Slide `layout` frontmatter | done | `theme.layouts[layout]` can wrap compiled MDX output, with package `layout-*` classes preserved as fallback. |

## Pages And Distribution

| Area | Case | Status | Notes |
| --- | --- | --- | --- |
| OGP metadata | Custom details page using `deckContext()` | sample | Verify title/description/image metadata can be rendered by the app. |
| Embed page | Viewer frame embedded in custom layout | done | Basic sample includes an embed route using shared viewer parts. |
| Share image route | OGP image generation route | design | Out of scope for the current package, but `deckContext()` should provide enough metadata. |
| Draft deck | Production hides draft deck | done | Router tests cover production vs dev behavior. |
| Draft slide | Per-slide draft behavior | design | Needs a clear rule: remove from deck, hide in viewer, or show only in dev. |
| Compile errors | File/slide context in CLI output | done | CLI tests cover MDX compile failures with `MDX compile failed`, deck source path, and slide index in stderr. |
| Runtime render errors | Clear 500 or slide error UI | done | Router tests cover slide render failures returning a 500 text response with deck source path and slide index. |

## Component Contracts

| Area | Case | Status | Notes |
| --- | --- | --- | --- |
| Server components | Deck-local `components/index.tsx` named exports | done | Current generated registry covers deck-local server components. |
| Client islands | Deck-local `components/client/index.tsx` named exports | done | Current generated client entry uses stable hashed ids to avoid collisions. |
| Prop serialization | Client component props | done | Client islands accept JSON values and fail with component/prop context for functions, JSX values, Dates, class instances, and other non-JSON values. |
| MDX expressions | JSX prop and children expressions | done | Current MDX module path supports standard MDX expressions as trusted app code. |
| Component name collisions | Same export names across decks | done | Server scope is deck-local; client ids are stable-hashed. |

## Accessibility And Layout

| Area | Case | Status | Notes |
| --- | --- | --- | --- |
| Heading order | Deck index, viewer, render document, details pages | done | Package tests cover the deck index heading, standard viewer heading, and slide labels; sample layout checks keep details/embed pages rendered through app-owned layouts. |
| Iframe title | Viewer frame and custom embed frame | done | Current viewer frame and `EmbedFrame` include titles; keep this in custom components. |
| Reduced motion | Viewer transitions and in-slide animation | done | Standard viewer and presentation documents include `prefers-reduced-motion` CSS guards; feature-specific animation samples should keep using the same media query. |
| Fixed 16:9 scaling | Desktop and mobile viewports | done | Package tests cover parent-sized iframe viewer and internal 1920x1080 scaling; `bun run smoke:viewport` captures desktop/mobile screenshots for sample, code, media, and motion decks. |
| Responsive content | Long text, images, code blocks, motion content | smoke | `bun run smoke:viewport` captures sample, code, media, and motion deck screenshots; add more stress content as official examples grow. |
| Color contrast | Default viewer controls and sample theme | done | `bun run smoke:viewport` checks default viewer control contrast against the page background. |

## Suggested Next Sample Decks

- `examples/basic/decks/sample`: keep this as the small happy-path deck for MDX, server components, client islands, local asset routing, viewer pages, and R2 binding fallback.
- `examples/basic/decks/media`: local JSX, remote image, Zenn-style YouTube/X/card/embed shorthand, single-line URL links, and fallback examples exist.
- `examples/basic/decks/code`: fenced code, built-in `CodeBlock`, and build-time Shiki highlighting examples exist.
- `examples/basic/decks/motion`: CSS animation, client island animation, slide transition, `:::fire`, `$fire`, and list fragment examples exist.

## Verification Commands

Use the repo-level gate after changing package behavior or generated examples:

```bash
bun run check
```

Use the sample gate when only sample decks or sample routes change:

```bash
bun run --cwd examples/basic check
```

Deployed cache and browser behavior need separate smoke checks after `wrangler deploy`, especially for R2 cache headers, `cf-cache-status`, mobile/touch navigation, and PDF/print output. For deployed R2 checks, see [Deployed R2 Cache Smoke](./deployed-r2-cache-smoke.md).

Local browser viewport smoke checks are documented in [Browser Smoke Checks](./browser-smoke.md). Local print-to-PDF smoke checks are documented in [PDF Smoke Checks](./pdf-smoke.md).
