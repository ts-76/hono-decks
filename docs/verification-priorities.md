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
- Build-time syntax highlighting direction: the renderer now exposes stable language/highlight metadata; actual generated highlighted HTML/classes, likely via Shiki, remains the next implementation step

Rationale: code-heavy decks are a likely use case, and code block rendering affects layout, theme, and export. Syntax highlighting should be decided early. The preferred direction is build-time highlighting, likely with Shiki or a similar library, so Worker runtime remains small and deterministic.

### 3. Diagnostics And Serialization

Stabilize authoring errors and client island boundaries:

- MDX compile error output with file and slide context: covered by CLI package tests
- Runtime render error behavior: covered by router package tests; render failures return a 500 response with deck source path and slide index
- Client island prop serialization constraints: JSON values are supported and non-JSON values fail with component/prop context
- Invalid props such as functions, JSX elements, dates, and class instances: covered by package tests

Rationale: this is DX infrastructure. If errors are vague or serialization rules are implicit, every later sample becomes harder to debug.

## P1: Public Viewer Usability

### 4. Embeds

Start with iframe-based embeds:

- YouTube iframe
- Generic `<EmbedFrame />` component
- Aspect ratio
- `title`
- `loading="lazy"`
- Fallback UI
- `sandbox`, `allow`, and `referrerpolicy`

Rationale: iframe embeds are common and can be supported without third-party script execution. X and other SNS embeds should come after a generic embed component because script-based embeds raise CSP, sandbox, and SSR concerns.

### 5. Accessibility And Viewport Behavior

Verify:

- Heading order
- Iframe titles
- Reduced motion
- Keyboard navigation
- Touch navigation
- Fixed 16:9 scaling on desktop and mobile
- Long text, image, and code overflow

Rationale: viewer quality depends on predictable scaling and navigation. These checks also catch regressions that unit tests miss, so some of them should become browser or deployed smoke checks.

### 6. Layout And Theme

Decide and demonstrate:

- Slide `layout` frontmatter behavior
- Deck-level theme behavior
- How theme tokens combine with `style`, `viewer.style`, and `viewer.head`

Rationale: layout and theme are public authoring APIs. They should be designed before many official sample decks are added, otherwise samples will encode temporary conventions.

## P2: Presentation Dynamics

### 7. In-Slide Animation

Verify:

- CSS animation
- Client island animation through `hono/jsx/dom`
- `prefers-reduced-motion`

Rationale: this adds expressiveness without requiring a new slide state model. It should still wait until accessibility and viewport behavior are stable.

### 8. Slide Transitions And Fragments

Design before implementing:

- `transition` frontmatter interpretation
- Fragment or step display for bullet lists and blocks
- Keyboard/touch behavior for step progression
- State sync between viewer controls and render frame

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

1. Implement build-time syntax highlighting with generated HTML/classes, likely via Shiki.
2. Extend `examples/basic/decks/media` with YouTube iframe and generic embed fallback after the embed API is designed.
3. Add browser/deployed smoke checks once viewer scaling, touch navigation, and R2 cache behavior need visual or edge confirmation.

Keep `examples/basic/decks/sample` small. It should remain the happy-path deck for MDX expressions, deck-local server components, client islands, viewer pages, and R2 binding fallback.
