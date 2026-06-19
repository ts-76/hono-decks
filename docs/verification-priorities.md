# Verification Priorities

This document records the recommended order for turning the verification matrix into package behavior, official examples, and smoke checks. The priority is based on two questions:

- Does this protect a core `@hono/decks` contract?
- Would delaying this create expensive API or architecture churn later?

See also: [Verification Matrix](./verification-matrix.md).

## Priority Summary

| Priority | Theme | Why it comes here |
| --- | --- | --- |
| P0 | Asset pipeline, code blocks, compile/runtime diagnostics, prop serialization | These define the core authoring and build-time contract. If they move later, examples and APIs built on top will churn. |
| P1 | Embeds, accessibility, viewport behavior, layout/theme | These make the slide system usable as a public viewer and shape package APIs, but can build on the P0 foundation. |
| P2 | Animation, transitions, fragments | These add presentation polish but touch navigation and state, so they should wait until viewer basics are stable. |
| P3 | OGP, speaker view, print/PDF | These are important distribution and presentation workflows, but they depend on stable render/viewer output. |

## P0: Core Contracts

### 1. Asset Pipeline

Finish asset coverage first:

- Local markdown image: `![Alt](./assets/image.png)`
- Local JSX image: `<img src="./assets/image.png" />`
- Bare local asset path: `assets/image.png`
- Remote image URL: `https://...`
- R2 binding-backed delivery
- Asset cache headers

Rationale: assets cross the MDX compiler, generated module output, runtime URL rewriting, Worker asset route, and optional R2 source wrapper. This is the easiest area to accidentally break with later renderer changes. Images also become prerequisites for OGP images, PDF export, theme examples, and richer media decks.

Recommended R2 stance: the official package sample should favor binding-backed delivery because it exercises `DeckSource.getAsset()` and Worker cache headers. Public R2/custom-domain URLs should be documented as normal remote URLs unless a stronger R2-specific policy is introduced.

### 2. Code Blocks

Add code block coverage next:

- Markdown fenced code block: covered by `examples/basic/decks/code`
- Escaping and overflow behavior: covered by `examples/basic/decks/code` and default presentation CSS
- Font sizing inside fixed 16:9 slides: covered by default presentation CSS
- MDX `<CodeBlock lang="ts">...</CodeBlock>` API: covered by package tests and `examples/basic/decks/code`; accepts text children plus `lang`, `filename`, and `highlight`
- Build-time syntax highlighting: covered by package and sample tests; Shiki runs during CLI/module generation and generated slide modules carry highlighted HTML

Rationale: code-heavy decks are a likely use case, and code block rendering affects layout, theme, and export. Syntax highlighting runs at build time so Worker runtime stays small and deterministic.

### 3. Diagnostics And Serialization

Stabilize authoring errors and client island boundaries:

- MDX compile error output with file and slide context: covered by CLI package tests
- Runtime render error behavior: covered by router package tests; render failures return a 500 response with deck source path and slide index
- Client island prop serialization constraints: JSON values are supported and non-JSON values fail with component/prop context
- Invalid props such as functions, JSX elements, dates, and class instances: covered by package tests

Rationale: this is DX infrastructure. If errors are vague or serialization rules are implicit, every later sample becomes harder to debug.

## P1: Public Viewer Usability

### 4. Embeds

Iframe-based embeds now have a built-in component and sample coverage:

- YouTube iframe: covered by `examples/basic/decks/media`
- Generic `<EmbedFrame />` component: covered by package and sample tests
- X/SNS link-first `<SocialEmbed />` component: covered by package and sample tests
- Aspect ratio: covered by `EmbedFrame` defaults and override sample
- `title`
- `loading="lazy"`
- Fallback UI
- `sandbox`, `allow`, and `referrerpolicy`
- CSP guidance: README documents that app routes own CSP headers and any third-party SNS scripts

Rationale: iframe embeds are common and can be supported without third-party script execution. X and other SNS embeds are link-first by default because third-party scripts, CSP, and Worker SSR do not always compose cleanly.

### 5. Accessibility And Viewport Behavior

Package-level coverage now verifies:

- Heading order for index/viewer/render surfaces
- Iframe titles for the viewer frame and embed components
- Reduced motion CSS guards in viewer and presentation documents
- Keyboard navigation command wiring
- Touch navigation command wiring
- Fixed 16:9 iframe/viewer contract and internal 1920x1080 scaling

Browser smoke coverage now exists for:

- Desktop and mobile screenshot checks for clipping or overlap
- Browser-side pointer swipe behavior
- Sample, code, media, and motion deck viewport screenshots
- Default viewer control contrast

Smoke coverage that still needs deployed or manual evidence:

- Real-device touch navigation before release
- Deployed R2/cache behavior
- Longer stress content once layout/theme APIs settle

Rationale: viewer quality depends on predictable scaling and navigation. These checks also catch regressions that unit tests miss, so some of them should become browser or deployed smoke checks.

### 6. Layout And Theme

Package-level API is now defined by `DeckTheme`:

- Slide `layout` frontmatter keeps the package `layout-*` class and can be wrapped by `theme.layouts[layout]`.
- Deck-level theme behavior is trusted app/package code: `theme.components` and `theme.layouts` are not runtime MDX eval hooks.
- `theme.style` is inserted into the presentation document before per-route `style`, so app overrides can still win.
- `viewer.style` and `viewer.head` remain scoped to the slug viewer shell, not the iframe presentation document.

Rationale: layout and theme are public authoring APIs. They should be designed before many official sample decks are added, otherwise samples will encode temporary conventions.

## P2: Presentation Dynamics

### 7. In-Slide Animation

Sample coverage now exists:

- CSS animation in `examples/basic/decks/motion`
- Client island animation through `hono/jsx/dom`
- `prefers-reduced-motion` override in the motion deck
- Browser viewport smoke coverage for the motion viewer page

Rationale: this adds expressiveness without requiring a new slide state model. It should still wait until accessibility and viewport behavior are stable.

### 8. Slide Transitions And Fragments

Initial implementation is now covered by [Slide Dynamics](./slide-dynamics.md), package tests, and the motion sample.

Implemented:

- `transition` frontmatter typing, validation, and `data-transition` output
- Explicit `<Fragment />` reveal elements
- `fragments: list` for top-level list items
- Keyboard/touch/control progression through fragment steps before slide changes
- State sync between viewer controls and render frame with optional step display

Follow-up:

- Richer visual transition direction hooks
- Browser smoke that actively steps through fragments, beyond route screenshot coverage

Rationale: fragments and transitions touch navigation semantics. They are valuable, but implementing them too early can lock the project into the wrong state model.

## P3: Distribution And Presentation Workflows

### 9. OGP And Embed Pages

Add examples for:

- OGP metadata through `deckContext()`
- Custom embed pages
- Optional share image route shape

Rationale: `deckContext()` already provides a good foundation, so this can wait until content rendering and assets are reliable.

### 10. Presenter Notes And Speaker View

Design:

- Notes syntax
- Speaker view route
- Public/private route boundaries
- State sync between main presentation and speaker view

Rationale: speaker view is important for real presentations but is a larger workflow than the core viewer. It should not block asset, code, embed, or layout verification.

### 11. Print And PDF Export

Verify:

- Print stylesheet
- One slide per page
- PDF export visual output
- Asset and code block rendering in print/PDF

Rationale: PDF output should be validated visually, not only through HTML assertions. It depends on stable layout, asset, and theme behavior.

## Recommended Next Steps

1. Add deployed R2/cache smoke checks once a deployed Worker target is available.
2. Add browser smoke that actively verifies fragment step progression and transition hooks.

Keep `examples/basic/decks/sample` small. It should remain the happy-path deck for MDX expressions, deck-local server components, client islands, viewer pages, and R2 binding fallback. Use `examples/basic/decks/motion` for animation, transition, and fragment experiments.
