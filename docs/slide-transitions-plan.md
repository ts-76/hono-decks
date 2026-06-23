# Slidev-style Built-in Slide Transitions Plan

This document records the implemented design for Slidev-style built-in slide transitions in `@hono/decks`.

Reference: https://sli.dev/guide/animations#builtin-transitions

## Current State

`@hono/decks` supports Slidev-style built-in slide transitions:

- `transition` is parsed from slide frontmatter.
- `transition` is parsed from deck frontmatter as a deck-level default.
- known values are emitted as `data-transition` on each slide section.
- unknown values produce a compile warning and fall back to `none`.
- base CSS implements the supported transition presets.
- the presentation runtime owns active, entering, leaving, inactive, and direction state.
- `prefers-reduced-motion` is respected.

## Goals

- Provide built-in slide switching transitions comparable to Slidev's first-party transition presets.
- Keep the authoring API frontmatter-based.
- Keep transitions inside the presentation iframe.
- Preserve the current viewer shell contract: viewer controls send commands, while the iframe owns slide state.
- Keep deck-local `theme.css` able to override transition visuals.
- Treat View Transitions API support as progressive enhancement.
- Preserve `prefers-reduced-motion` behavior.

## Non-Goals

- Do not introduce Vue, React, or a client animation framework dependency.
- Do not move transition state into the outer viewer shell.
- Do not require app-level JavaScript to enable normal transitions.
- Do not implement per-element motion variants in this phase.

## Authoring API

Slide transitions remain slide frontmatter:

```mdx
---
title: Motion Example
transition: slide-left
---
```

The supported values are:

- `none`
- `fade`
- `fade-out`
- `slide-left`
- `slide-right`
- `slide-up`
- `slide-down`
- `view-transition`

Deck-level `transition` is the fallback for slides without their own `transition`. Slide frontmatter takes precedence over deck frontmatter.

## Runtime Contract

The presentation runtime should track:

- current slide index
- previous slide index
- navigation direction: `forward` or `backward`
- transition status: idle, entering, leaving

On slide navigation, the runtime should:

1. calculate the target slide and direction.
2. keep both the current and target slide renderable during the transition.
3. attach stable data attributes or classes for active, entering, and leaving slides.
4. complete the transition by hiding non-active slides.
5. publish the existing `hono-decks:state` message shape without breaking viewers.

Suggested DOM attributes:

```html
<section
  class="slide layout-default"
  data-slide-index="1"
  data-transition="slide-left"
  data-slide-state="entering"
  data-slide-direction="forward"
>
  ...
</section>
```

Possible state values:

- `active`
- `entering`
- `leaving`
- `inactive`

## Built-in Transition Behavior

### `fade`

Crossfade between leaving and entering slides.

### `fade-out`

Fade the old slide out first, then show the new slide.

### `slide-left`

Forward navigation moves the new slide in from the right and the old slide out to the left. Backward navigation reverses the direction.

### `slide-right`

Forward navigation moves the new slide in from the left and the old slide out to the right. Backward navigation reverses the direction.

### `slide-up`

Forward navigation moves the new slide in from the bottom and the old slide out to the top. Backward navigation reverses the direction.

### `slide-down`

Forward navigation moves the new slide in from the top and the old slide out to the bottom. Backward navigation reverses the direction.

### `view-transition`

Use `document.startViewTransition()` when available. Fall back to `fade` when unsupported or when reduced motion is requested.

## CSS Contract

Package base CSS should provide functional defaults. Theme authors can override them in deck-local `theme.css`.

The base selectors should remain stable:

```css
.slide[data-transition][data-slide-state="entering"] {}
.slide[data-transition][data-slide-state="leaving"] {}
.slide[data-slide-direction="forward"] {}
.slide[data-slide-direction="backward"] {}
```

Reduced motion must disable movement:

```css
@media (prefers-reduced-motion: reduce) {
  .slide[data-transition] {
    transition-duration: .001ms !important;
    animation-duration: .001ms !important;
    transform: none !important;
  }
}
```

## Implementation Notes

- `SlideTransition` intentionally excludes the old `slide` and `zoom` values.
- `slide` and `zoom` now warn and fall back to `none`.
- Transition timing is controlled with CSS variables:
  - `--hono-decks-transition-duration`
  - `--hono-decks-transition-easing`
- Fragment step navigation does not trigger slide transitions.
- Overview, print preview, and print rendering disable transition movement.

## Test Plan

- compiler tests for each supported transition value.
- compiler warning test for unknown transition values.
- renderer tests for `data-transition`, `data-slide-state`, and `data-slide-direction`.
- runtime script tests for forward and backward navigation state.
- CSS tests for built-in transition hooks and reduced motion.
- example integration test for the motion deck.
- browser smoke test that verifies slide navigation still works with transitions enabled.

## Open Questions

- Should `view-transition` be opt-in per deck or per slide only?
- Should transition duration ever be configurable through frontmatter, or should it stay CSS-only?
