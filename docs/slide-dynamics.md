# Slide Dynamics Design

This document defines the implemented `@hono/decks` behavior for slide transitions and fragment or step display. Both features affect navigation semantics, viewer state, and client island behavior, so this file also records the remaining follow-up decisions.

## Goals

- Keep slide content as trusted, build-time compiled MDX/Hono JSX modules.
- Keep transition and fragment behavior inside the presentation iframe.
- Keep the viewer shell as a controller: it sends commands and renders state, but does not inspect slide DOM.
- Preserve existing `next`, `previous`, `goTo`, keyboard, touch, and TOC behavior.
- Respect `prefers-reduced-motion` for transitions and fragment reveal effects.

## Non-Goals

- No runtime evaluation of raw MDX or user-provided scripts.
- No React-specific provider or animation library requirement.
- No per-fragment deep linking in the first implementation.
- No synchronized multi-window presenter state in this step.

## Public Authoring API

### Slide Transitions

`transition` remains slide frontmatter:

```mdx
---
title: Product Shape
transition: fade
---
```

Supported values are a Slidev-style string union at runtime:

- `none`
- `fade`
- `fade-out`
- `slide-left`
- `slide-right`
- `slide-up`
- `slide-down`
- `view-transition`

Unknown values produce a compile warning and fall back to `none`. The raw value is not copied into CSS class names except through a sanitizer and a known-value check.

Deck frontmatter can define a default transition for every slide. Slide frontmatter overrides that deck-level default.

Deck and slide frontmatter can also define timing. Slide values override deck values, and both compile to CSS variables on the slide element:

```mdx
---
transition: slide-left
transitionDuration: 420ms
transitionEasing: cubic-bezier(.2, 0, 0, 1)
---
```

If no timing is specified, package defaults are `--hono-decks-transition-duration: .24s` and `--hono-decks-transition-easing: ease`. Invalid timing values produce compile warnings and are ignored.

### Fragments

Fragments are slide-local reveal steps. The first implementation should support both explicit and list-based authoring.

Explicit fragments:

```mdx
<Fragment>First point</Fragment>
<Fragment order={2}>Second point</Fragment>
```

List shorthand:

```mdx
---
fragments: list
---

- First point
- Second point
- Third point
```

Slide frontmatter:

- `fragments: list` marks top-level list items as fragments in source order.
- `fragments: manual` only uses explicit `<Fragment />` components.
- omitted or `fragments: none` means no automatic fragments.

Manual `<Fragment order={number}>` can override ordering. If `order` is omitted, the runtime falls back to document order.

## Runtime State Model

The presentation iframe owns the canonical cursor:

```ts
interface DeckCursor {
  slideIndex: number;
  stepIndex: number;
  stepCount: number;
  slideCount: number;
}
```

Navigation rules:

- `next`: reveal the next fragment if `stepIndex < stepCount`; otherwise move to the next slide at `stepIndex = 0`.
- `previous`: hide the current fragment if `stepIndex > 0`; otherwise move to the previous slide at that slide's final step.
- `goTo(index)`: move to the target slide at `stepIndex = 0`.
- `goTo(index, stepIndex)`: optional future command for presenter tools; clamp both values.

The iframe publishes state after every cursor change:

```ts
window.parent.postMessage({
  type: "hono-decks:state",
  index: slideIndex,
  stepIndex,
  stepCount,
  slideCount,
}, "*");
```

The viewer should keep the existing `index` field for backward compatibility. The default controls show slide progress only; richer step-aware custom controls can read `stepIndex` and `stepCount` from viewer state or root data attributes.

## Render Contract

Rendered slide sections keep stable authored metadata. `data-transition` is compiled metadata; it is not the active CSS selector during animation.

```html
<section
  class="slide layout-cover"
  data-slide-index="0"
  data-transition="fade"
  data-slide-state="inactive"
>
  ...
</section>
```

The presentation runtime owns slide transition state. During navigation it sets:

- `data-active-transition="<known transition>"`
- `data-slide-state="active"`
- `data-slide-state="entering"`
- `data-slide-state="leaving"`
- `data-slide-state="inactive"`
- `data-slide-direction="forward"`
- `data-slide-direction="backward"`

On slide navigation, the runtime reads the incoming slide's `data-transition`, applies it as `data-active-transition` to both outgoing and incoming slides, and copies the incoming slide's timing variables to both slides for the active transition. `data-active-transition` is removed for inactive slides, instant changes, overview mode, print, and reduced-motion paths.

Fragment step navigation does not trigger slide transitions. Slide transitions only run when the slide index changes.

Fragments are normal elements with stable data attributes:

```html
<span data-hono-decks-fragment data-fragment-order="1">First point</span>
```

The presentation script controls visibility:

- visible when `Number(fragment.dataset.fragmentOrder) <= stepIndex`
- hidden via `data-fragment-hidden` and `aria-hidden`
- visible state must not remount client islands inside the fragment

Client islands inside fragments should hydrate once. Reveal/hide changes must use DOM attributes or CSS, not remove/recreate island roots.

## CSS Contract

Base CSS should include conservative defaults:

```css
.slide[data-active-transition] {
  transition:
    opacity var(--hono-decks-active-transition-duration, var(--hono-decks-slide-transition-duration, var(--hono-decks-transition-duration)))
      var(--hono-decks-active-transition-easing, var(--hono-decks-slide-transition-easing, var(--hono-decks-transition-easing))),
    transform var(--hono-decks-active-transition-duration, var(--hono-decks-slide-transition-duration, var(--hono-decks-transition-duration)))
      var(--hono-decks-active-transition-easing, var(--hono-decks-slide-transition-easing, var(--hono-decks-transition-easing)));
}
[data-hono-decks-fragment][data-fragment-hidden="true"] {
  visibility: hidden;
}
@media (prefers-reduced-motion: reduce) {
  .slide,
  [data-hono-decks-fragment] {
    transition-duration: .001ms !important;
    animation-duration: .001ms !important;
  }
}
```

Theme CSS can override the visual style of known transition and fragment states, but not the navigation algorithm.

The runtime completes transitions on `transitionend` or `transitioncancel` for `opacity`, `transform`, or `all`, but it does not finish on the first early event. It waits until the computed max `transition-duration + transition-delay` is effectively reached, with a fallback timeout for skipped events. `ms` and `s` units are supported; if no computed timing is available, the fallback timeout uses 240ms.

## Compiler And Model Changes

Model additions:

```ts
export type SlideTransition =
  | "none"
  | "fade"
  | "fade-out"
  | "slide-left"
  | "slide-right"
  | "slide-up"
  | "slide-down"
  | "view-transition";
export type SlideFragmentsMode = "none" | "manual" | "list";

export interface DeckFrontmatter {
  transition?: SlideTransition;
  transitionDuration?: string;
  transitionEasing?: string;
  meta: Record<string, unknown>;
}

export interface SlideFrontmatter {
  transition?: SlideTransition;
  transitionDuration?: string;
  transitionEasing?: string;
  fragments?: SlideFragmentsMode;
  meta: Record<string, unknown>;
}
```

The MDX module generator:

- validate `transition`
- apply deck-level `transition` as the slide fallback
- parse `fragments`
- inject or expose a built-in `Fragment` component
- add a remark transform that marks top-level list items when `fragments: list`
- emit compile warnings with deck source path and slide index for unknown values

## Viewer Contract

The viewer script remains generic. It sends commands and keeps step state, but the default controller displays only slide progress:

- `previous`, `next`, `goTo`, `fullscreen` commands stay unchanged.
- The state listener accepts optional `stepIndex` and `stepCount`.
- Position text stays slide-only, for example `2 / 5`.
- The viewer root receives `data-step-index` and `data-step-count` for custom controllers or analytics.

Custom viewers using `deckContext()` or `createDeckViewerParts()` can keep reading `deckViewer.controls`, `deckViewer.toc`, and `deckViewer.frame`. Future APIs can expose richer slide step metadata, but the first implementation does not require it.

## Test Strategy

- Compiler tests for valid and invalid `transition`.
- Generator tests cover `fragments: list` producing fragment attributes in generated slide output.
- Render tests cover `<Fragment />`, fragment visibility attributes, and step-aware state publishing.
- Router tests cover state message shape and viewer position behavior.
- Example tests cover `examples/basic/decks/motion` transition and fragment output.
- Browser smoke checks cover the viewer route and actively verify fragment progression without adding fragment step text to the default controller.

## Open Decisions

- Whether nested list items participate in `fragments: list`; first implementation should restrict to top-level list items.
- Whether `goTo` from TOC should always reset to step 0; this design says yes.
- Whether fragment state should be reflected in URL hash; out of scope for the first implementation.
