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
| Remote image asset | `https://...` remains unchanged | done | `examples/basic/decks/media` and node adapter tests verify remote URLs remain normal remote URLs and are not rewritten to local asset paths. |
| R2 public URL | Custom domain or `r2.dev` URL used directly | design | Treat as remote URL unless an explicit R2 asset policy is introduced. Decide whether this belongs in the official sample. |
| R2 binding delivery | Local asset path served from R2 with cache headers | done | `withR2Assets()` supports a pre-existing object using the generated `sourcePath` as the R2 key and falls back to embedded local assets when the binding is missing. |
| Asset cache headers | Long-lived cache for R2-backed assets | done | Local tests assert `Cache-Control`; Cloudflare edge cache hit/miss needs deployed smoke verification. |
| Asset cache headers | `cf-cache-status` / `age` on deployed Worker | smoke | Requires deployment. Local Miniflare-style tests can only check route behavior and headers. |

R2 official sample direction is still open. The current package API supports binding-backed delivery because it proves the Worker integration and cache headers without requiring an upload command. A public URL example is simpler for users, but it does not exercise `DeckSource.getAsset()` or Worker cache behavior.

## Embeds

| Area | Case | Status | Notes |
| --- | --- | --- | --- |
| YouTube | `<iframe src="https://www.youtube.com/embed/...">` | sample | Verify aspect ratio, `title`, `loading="lazy"`, fullscreen permissions, and responsive scaling inside the fixed 16:9 canvas. |
| X / SNS embed | Script-based embed or blockquote fallback | design | Prefer a package-provided or sample component that degrades to a link because third-party scripts, CSP, and Worker SSR do not always compose cleanly. |
| Generic iframe | `<EmbedFrame src title />` or similar component | design | Should centralize `sandbox`, `allow`, `referrerpolicy`, aspect ratio, and loading fallback defaults. |
| CSP | Embed-safe policy for standard viewer | design | Document what the package sets, what the app must set, and how custom viewer pages can loosen or tighten policy. |
| Sandbox | Safe defaults for embedded content | design | YouTube and generic embeds likely need different `sandbox` / `allow` presets. |
| Fallback | Loading and blocked-content fallback UI | sample | Needed for offline, privacy extensions, strict CSP, or third-party failure. |

## Code Blocks

| Area | Case | Status | Notes |
| --- | --- | --- | --- |
| Markdown fenced code | Triple-backtick code block | done | `examples/basic/decks/code` verifies language classes, HTML escaping, and overflow-oriented default presentation styles. |
| MDX component code block | `<CodeBlock lang="ts">...</CodeBlock>` | design | Prefer a package-provided component with plain text children and explicit props such as `lang`, `filename`, and `highlight`; avoid JSX-child semantics for source text. |
| Syntax highlighting | Build-time Shiki or equivalent | design | Preferred direction is build-time highlighting so Worker runtime stays small and deterministic; runtime should render generated HTML/classes rather than load a highlighter. |
| Copy UI | Copy button or line highlight controls | design | Optional; should not be required for the core renderer. |

## Animation And Navigation

| Area | Case | Status | Notes |
| --- | --- | --- | --- |
| In-slide CSS animation | CSS animation in slide content | sample | Verify `prefers-reduced-motion` and no layout shift in fixed viewport. |
| In-slide client animation | `hono/jsx/dom` island animation | sample | Verify island hydration and state updates continue to work inside slides. |
| Slide transition | `transition` frontmatter | design | Package should parse and apply known transitions rather than leaving the value unused. |
| Fragment / step display | Progressive reveal for bullets or blocks | design | Needs data model and keyboard/touch interaction semantics. |
| Keyboard navigation | Arrow keys, space, fullscreen | done | Current viewer/render scripts cover the core path; keep route tests and add browser smoke later. |
| Touch navigation | Tap/swipe on mobile | smoke | Needs browser/device viewport verification. |

## Presentation And Export

| Area | Case | Status | Notes |
| --- | --- | --- | --- |
| Presenter notes | `notes` frontmatter or slide notes block | design | Model exists partially; speaker-view behavior still needs an API and route. |
| Speaker view | Separate presenter route/window | design | Needs state sync with the main presentation and clear public/private route boundaries. |
| Print view | Browser print stylesheet | sample | Verify each slide paginates predictably. |
| PDF export | Print-to-PDF compatible output | smoke | Should be validated visually, not only via HTML assertions. |
| Theme switching | Deck-level theme | design | Confirm where theme tokens live and how they combine with `style` / `viewer.head`. |
| Layout switching | Slide `layout` frontmatter | sample | Verify named layouts with MDX content, components, images, and code blocks. |

## Pages And Distribution

| Area | Case | Status | Notes |
| --- | --- | --- | --- |
| OGP metadata | Custom details page using `deckContext()` | sample | Verify title/description/image metadata can be rendered by the app. |
| Embed page | Viewer frame embedded in custom layout | done | Basic sample includes an embed route using shared viewer parts. |
| Share image route | OGP image generation route | design | Out of scope for the current package, but `deckContext()` should provide enough metadata. |
| Draft deck | Production hides draft deck | done | Router tests cover production vs dev behavior. |
| Draft slide | Per-slide draft behavior | design | Needs a clear rule: remove from deck, hide in viewer, or show only in dev. |
| Compile errors | File/slide context in CLI output | sample | Add fixtures for MDX compile failures and expected diagnostics. |
| Runtime render errors | Clear 500 or slide error UI | design | Decide whether the package catches render errors per slide or lets Hono handle them. |

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
| Heading order | Deck index, viewer, render document, details pages | sample | Verify meaningful heading structure in package pages and sample layouts. |
| Iframe title | Viewer frame and custom embed frame | done | Current viewer frame includes a title; keep this in custom components. |
| Reduced motion | Viewer transitions and in-slide animation | design | Package should respect `prefers-reduced-motion` for transitions and controls. |
| Fixed 16:9 scaling | Desktop and mobile viewports | smoke | Needs browser screenshot or visual checks to catch clipping and overlap. |
| Responsive content | Long text, images, code blocks | sample | Add sample slides that stress wrapping, overflow, and viewport bounds. |
| Color contrast | Default viewer controls and sample theme | smoke | Can be partly automated later, but visual review is still useful. |

## Suggested Next Sample Decks

- `examples/basic/decks/sample`: keep this as the small happy-path deck for MDX, server components, client islands, local asset routing, viewer pages, and R2 binding fallback.
- `examples/basic/decks/media`: local JSX and remote image examples exist; extend it with YouTube, iframe, and SNS fallback examples after the embed API is designed.
- `examples/basic/decks/code`: fenced code exists; extend with MDX `CodeBlock` and build-time syntax highlight fixtures after the component API is implemented.
- `examples/basic/decks/motion`: add CSS animation, client island animation, transitions, and fragment/step behavior once the runtime supports it.

## Verification Commands

Use the repo-level gate after changing package behavior or generated examples:

```bash
bun run check
```

Use the sample gate when only sample decks or sample routes change:

```bash
bun run --cwd examples/basic check
```

Deployed cache and browser behavior need separate smoke checks after `wrangler deploy`, especially for R2 cache headers, `cf-cache-status`, mobile/touch navigation, and PDF/print output.
