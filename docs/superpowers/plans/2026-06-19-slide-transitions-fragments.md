# Slide Transitions And Fragments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement known slide transitions and fragment/step navigation for `@hono/decks`.

**Architecture:** The MDX compiler validates transition and fragment frontmatter at build time, then emits normal Hono JSX modules. The presentation iframe owns slide/step state and publishes it to the viewer shell through the existing `hono-decks:state` postMessage channel.

**Tech Stack:** TypeScript, Hono, Hono JSX, `@mdx-js/mdx`, existing package tests with Vitest, basic Worker sample with Bun.

---

## File Structure

- Modify `packages/decks/src/deck/model.ts`: add transition and fragment mode types to `SlideFrontmatter`.
- Modify `packages/decks/src/generator/mdx-module-generator.ts`: parse and validate frontmatter, inject fragment transforms, and emit warnings.
- Modify `packages/decks/src/renderer/jsx-renderer.ts`: add built-in `Fragment` server component for explicit fragments.
- Modify `packages/decks/src/renderer/compiled-render.ts`: render known transition data, add fragment CSS, and update presentation state/navigation.
- Modify `packages/decks/src/server/router.ts`: display optional step state in standard viewer controls.
- Modify `packages/decks/test/compiler.test.ts`, `packages/decks/test/manifest-generator.test.ts`, `packages/decks/test/compiled-render.test.ts`, and `packages/decks/test/router.test.ts`: cover behavior.
- Modify `examples/basic/decks/motion/deck.mdx` and `examples/basic/test/worker-sample.test.ts`: demonstrate transition and fragments.
- Modify `docs/slide-dynamics.md`, `docs/verification-matrix.md`, and `docs/verification-priorities.md`: mark implemented pieces.

## Task 1: Type The Public Slide Dynamics Contract

**Files:**
- Modify: `packages/decks/src/deck/model.ts`
- Test: `packages/decks/test/compiler.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test to `packages/decks/test/compiler.test.ts`:

```ts
it("preserves known transition and fragment frontmatter", async () => {
  const deck = await compileMarkdown({
    slug: "motion",
    sourcePath: "decks/motion/deck.mdx",
    kind: "directory",
    markdown: `---
title: Motion
---

---
title: Reveal
transition: fade
fragments: list
---

- First
- Second
`,
  });

  expect(deck.slides[0].meta.transition).toBe("fade");
  expect(deck.slides[0].meta.fragments).toBe("list");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
bun test packages/decks/test/compiler.test.ts -t "preserves known transition"
```

Expected: FAIL because `SlideFrontmatter` and compiler output do not expose `fragments`.

- [ ] **Step 3: Add minimal model types**

In `packages/decks/src/deck/model.ts`, add:

```ts
export type SlideTransition = "none" | "fade" | "slide" | "zoom";
export type SlideFragmentsMode = "none" | "manual" | "list";
```

Then update `SlideFrontmatter`:

```ts
export interface SlideFrontmatter {
  title?: string;
  layout?: string;
  className?: string;
  notes?: string;
  background?: string;
  transition?: SlideTransition;
  fragments?: SlideFragmentsMode;
  meta: Record<string, unknown>;
}
```

- [ ] **Step 4: Parse fragment mode in existing compiler path**

In `packages/decks/src/compiler/compiler.ts`, update `toSlideFrontmatter()` so it assigns:

```ts
transition: takeKnownString(meta, "transition", ["none", "fade", "slide", "zoom"]),
fragments: takeKnownString(meta, "fragments", ["none", "manual", "list"]),
```

Add this helper near `takeString()`:

```ts
function takeKnownString<const T extends string>(
  source: Record<string, unknown>,
  key: string,
  values: readonly T[],
): T | undefined {
  const value = source[key];
  delete source[key];
  return typeof value === "string" && values.includes(value as T) ? (value as T) : undefined;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
bun test packages/decks/test/compiler.test.ts -t "preserves known transition"
```

Expected: PASS.

## Task 2: Validate Module Generator Frontmatter

**Files:**
- Modify: `packages/decks/src/generator/mdx-module-generator.ts`
- Test: `packages/decks/test/manifest-generator.test.ts`

- [ ] **Step 1: Write the failing test**

Add a test that compiles a directory deck with `transition: spin` and expects a compile warning and fallback:

```ts
expect(result.decks[0].slides[0].meta.transition).toBe("none");
expect(result.decks[0].warnings).toContainEqual(
  expect.objectContaining({
    code: "unknown-transition",
    slideIndex: 0,
  }),
);
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
bun test packages/decks/test/manifest-generator.test.ts -t "unknown-transition"
```

Expected: FAIL because unknown transitions currently pass through.

- [ ] **Step 3: Implement known-value validation**

In `packages/decks/src/generator/mdx-module-generator.ts`, change slide meta creation:

```ts
const warnings: CompiledDeck["warnings"] = [];
const slideMeta = toSlideFrontmatter(slideAttrs, warnings, index);
```

Update `toSlideFrontmatter()`:

```ts
function toSlideFrontmatter(
  attrs: Record<string, unknown>,
  warnings: CompiledDeck["warnings"],
  slideIndex: number,
): SlideFrontmatter {
  const meta = { ...attrs };
  return {
    title: takeString(meta, "title"),
    layout: takeString(meta, "layout"),
    className: takeString(meta, "class"),
    notes: takeString(meta, "notes"),
    background: takeString(meta, "background"),
    transition: takeKnownFrontmatter(meta, "transition", ["none", "fade", "slide", "zoom"], "none", warnings, slideIndex, "unknown-transition"),
    fragments: takeKnownFrontmatter(meta, "fragments", ["none", "manual", "list"], "none", warnings, slideIndex, "unknown-fragments"),
    meta,
  };
}
```

Add helper:

```ts
function takeKnownFrontmatter<const T extends string>(
  source: Record<string, unknown>,
  key: string,
  values: readonly T[],
  fallback: T,
  warnings: CompiledDeck["warnings"],
  slideIndex: number,
  code: string,
): T | undefined {
  const value = source[key];
  delete source[key];
  if (value === undefined) return undefined;
  if (typeof value === "string" && values.includes(value as T)) return value as T;
  warnings.push({ code, slideIndex, message: `Unknown ${key} value "${String(value)}"; using ${fallback}.` });
  return fallback;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
bun test packages/decks/test/manifest-generator.test.ts -t "unknown-transition"
```

Expected: PASS.

## Task 3: Add Explicit Fragment Component

**Files:**
- Modify: `packages/decks/src/renderer/jsx-renderer.ts`
- Test: `packages/decks/test/compiled-render.test.ts`

- [ ] **Step 1: Write the failing test**

Add a compiled render test:

```ts
it("renders explicit Fragment components with stable fragment attributes", async () => {
  const html = await renderCompiledDeckPageAsync({
    deck: {
      ...deck,
      slides: [{
        ...deck.slides[0],
        nodes: [{
          type: "component",
          name: "Fragment",
          props: { order: 2 },
          children: [{ type: "text", value: "Second reveal" }],
        }],
      }],
    },
    mountPath: "/slides",
  });

  expect(html).toContain("data-hono-decks-fragment");
  expect(html).toContain('data-fragment-order="2"');
  expect(html).toContain("Second reveal");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
bun test packages/decks/test/compiled-render.test.ts -t "explicit Fragment"
```

Expected: FAIL because `Fragment` is not a built-in component.

- [ ] **Step 3: Implement built-in Fragment**

In `packages/decks/src/renderer/jsx-renderer.ts`, add to `builtInSlideComponents`:

```tsx
Fragment: (props) => {
  const order = typeof props.order === "number" ? props.order : undefined;
  return jsx("span", {
    "data-hono-decks-fragment": true,
    ...(order !== undefined ? { "data-fragment-order": String(order) } : {}),
    children: props.children,
  });
},
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
bun test packages/decks/test/compiled-render.test.ts -t "explicit Fragment"
```

Expected: PASS.

## Task 4: Implement Step-Aware Presentation Navigation

**Files:**
- Modify: `packages/decks/src/renderer/compiled-render.ts`
- Test: `packages/decks/test/compiled-render.test.ts`

- [ ] **Step 1: Write the failing test**

Add assertions that `renderCompiledDeckPage()` contains:

```ts
expect(html).toContain("let stepIndex = 0");
expect(html).toContain("data-fragment-hidden");
expect(html).toContain("stepIndex, stepCount");
expect(html).toContain('message.action === "next"');
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
bun test packages/decks/test/compiled-render.test.ts -t "step-aware"
```

Expected: FAIL because the script only tracks slide index.

- [ ] **Step 3: Update presentation script**

In `renderPresentationScript()`, introduce:

```js
let stepIndex = 0;
let stepCount = 0;

function currentFragments() {
  const slide = slides[index];
  if (!(slide instanceof HTMLElement)) return [];
  return Array.from(slide.querySelectorAll("[data-hono-decks-fragment]"));
}

function updateFragments(nextStepIndex) {
  const fragments = currentFragments();
  stepCount = fragments.length;
  stepIndex = Math.max(0, Math.min(stepCount, nextStepIndex));
  fragments.forEach((fragment, fallbackIndex) => {
    const order = Number(fragment.getAttribute("data-fragment-order") ?? fallbackIndex + 1);
    const visible = order <= stepIndex;
    fragment.toggleAttribute("hidden", !visible);
    fragment.toggleAttribute("data-fragment-hidden", !visible);
  });
}
```

Change `publishState()` to include `stepIndex` and `stepCount`. Change `next` and `previous` command handling to call helpers that advance steps before changing slides.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
bun test packages/decks/test/compiled-render.test.ts -t "step-aware"
```

Expected: PASS.

## Task 5: Add Viewer Step Position Display

**Files:**
- Modify: `packages/decks/src/server/router.ts`
- Test: `packages/decks/test/router.test.ts`

- [ ] **Step 1: Write the failing test**

Add a router test that requests a viewer page and expects the script to handle step state:

```ts
expect(html).toContain("message.stepCount");
expect(html).toContain('String(message.stepIndex) + " / " + String(message.stepCount)');
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
bun test packages/decks/test/router.test.ts -t "step state"
```

Expected: FAIL because viewer state only shows slide position.

- [ ] **Step 3: Update viewer state listener**

In `renderViewerScript()`, change state handling:

```js
const slidePosition = String(message.index + 1) + " / " + String(message.slideCount ?? "?");
const stepCount = Number(message.stepCount ?? 0);
const stepIndex = Number(message.stepIndex ?? 0);
if (position) {
  position.textContent = stepCount > 0
    ? slidePosition + " · " + String(stepIndex) + " / " + String(stepCount)
    : slidePosition;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
bun test packages/decks/test/router.test.ts -t "step state"
```

Expected: PASS.

## Task 6: Add Motion Deck Transition And Fragment Example

**Files:**
- Modify: `examples/basic/decks/motion/deck.mdx`
- Modify generated: `examples/basic/src/generated/decks.ts`
- Modify generated: `examples/basic/src/generated/decks/motion/*.ts`
- Test: `examples/basic/test/worker-sample.test.ts`

- [ ] **Step 1: Write the failing test**

Add assertions:

```ts
expect(html).toContain('data-transition="fade"');
expect(html).toContain("data-hono-decks-fragment");
expect(html).toContain("stepIndex");
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
bun run --cwd examples/basic test
```

Expected: FAIL because the motion deck has no transition or fragments yet.

- [ ] **Step 3: Update motion deck**

Add `transition: fade` to one motion slide and add:

```mdx
<Fragment>First reveal</Fragment>
<Fragment>Second reveal</Fragment>
```

- [ ] **Step 4: Regenerate and verify**

Run:

```bash
bun run --cwd examples/basic decks:compile
bun run --cwd examples/basic test
```

Expected: PASS.

## Task 7: Run Full Verification And Commit

**Files:**
- Verify all changed files

- [ ] **Step 1: Run package and sample checks**

Run:

```bash
bun run check
```

Expected: PASS.

- [ ] **Step 2: Run browser smoke**

Run:

```bash
bun run --cwd examples/basic smoke:viewport
```

Expected: PASS, including `motion` desktop and mobile screenshots.

- [ ] **Step 3: Update verification docs**

Update:

- `docs/verification-matrix.md`: mark slide transition and fragment rows as `done`.
- `docs/verification-priorities.md`: move Recommended Next Steps to deployed R2/cache and P3 distribution workflows.
- `docs/slide-dynamics.md`: move any still-open implementation details into a short "Future Work" section.

- [ ] **Step 4: Commit**

Run:

```bash
git add packages/decks examples/basic docs
git commit -m "Add slide transition and fragment navigation"
```

Expected: commit succeeds.
