# Deck Compiler Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic compiler that converts raw MDX-like deck text into the `CompiledDeck` runtime contract.

**Architecture:** This slice adapts the existing Markdown/MDX-like parser behavior into the new compiled-deck model. It keeps compilation pure and runtime-safe: no filesystem reads, no deployed runtime compilation, no real MDX module execution.

**Tech Stack:** TypeScript, Vitest, existing parser/render utilities.

---

## Scope

This plan implements:

- `DeckCompiler` and `CompileDeckInput` contracts.
- `compileMarkdown()` for raw MDX-like deck text.
- Deck-level frontmatter parsing.
- Slide-level frontmatter parsing.
- Markdown block rendering into compiled slide HTML.
- MDX-like component extraction into `ComponentPlaceholder`.
- Unsupported local relative asset errors for single-file decks.

This plan does not implement:

- Filesystem scanning.
- Manifest file generation.
- Full MDX package compilation.
- Development editor/save/HMR routes.
- Agent editing tools.

## File Structure

- Modify `src/deck.ts`
  - Add `DeckCompiler`, `CompileDeckInput`, and `CompileError` contracts.

- Create `src/compiler.ts`
  - Owns pure compilation from raw markdown/MDX-like text to `CompiledDeck`.

- Modify `src/mod.ts`
  - Export compiler API and new contracts.

- Add `test/compiler.test.ts`
  - Covers deck frontmatter, slide frontmatter, component placeholders, and single-file asset errors.

---

### Task 1: Compiler Contract And Happy Path

**Files:**
- Modify: `src/deck.ts`
- Create: `src/compiler.ts`
- Test: `test/compiler.test.ts`

- [ ] **Step 1: Write the failing compiler happy path test**

Create `test/compiler.test.ts` with this content:

```ts
import { describe, expect, it } from "vitest";
import { compileMarkdown } from "../src/compiler";

describe("compileMarkdown", () => {
  it("compiles deck and slide frontmatter into a CompiledDeck", async () => {
    const deck = await compileMarkdown({
      slug: "deck1",
      sourcePath: "decks/deck1/deck.mdx",
      kind: "directory",
      markdown: `---
title: Hono Slides
description: MDX decks on Workers
author: Toma
tags: [hono, workers]
date: 2026-06-04
theme: default
draft: false
presenter: true
customDeckKey: kept
---

# Cover

<Hero title="Hello" featured />

---
title: Details
layout: two-column
class: dense
notes: |
  Mention the runtime contract.
background: ./assets/bg.png
transition: fade
customSlideKey: kept
---

## Details

- One
- Two`,
    });

    expect(deck).toMatchObject({
      slug: "deck1",
      sourcePath: "decks/deck1/deck.mdx",
      kind: "directory",
      meta: {
        title: "Hono Slides",
        description: "MDX decks on Workers",
        author: "Toma",
        tags: ["hono", "workers"],
        date: "2026-06-04",
        theme: "default",
        draft: false,
        presenter: true,
        meta: { customDeckKey: "kept" },
      },
    });
    expect(deck.slides).toHaveLength(2);
    expect(deck.slides[0].html).toContain("<h1>Cover</h1>");
    expect(deck.slides[0].components).toEqual([
      {
        id: "deck1-0-0",
        name: "Hero",
        props: { title: "Hello", featured: true },
        source: '<Hero title="Hello" featured />',
      },
    ]);
    expect(deck.slides[1].meta).toMatchObject({
      title: "Details",
      layout: "two-column",
      className: "dense",
      notes: "Mention the runtime contract.",
      background: "./assets/bg.png",
      transition: "fade",
      meta: { customSlideKey: "kept" },
    });
    expect(deck.slides[1].html).toContain("<h2>Details</h2>");
    expect(deck.slides[1].html).toContain("<li>One</li>");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/compiler.test.ts`

Expected: FAIL with module resolution error for `../src/compiler`.

- [ ] **Step 3: Add compiler contracts**

Append these exports to `src/deck.ts`:

```ts
export interface CompileDeckInput {
  slug: string;
  sourcePath: string;
  kind: DeckKind;
  markdown: string;
}

export interface DeckCompiler {
  compileMarkdown(input: CompileDeckInput): Promise<CompiledDeck>;
}

export class CompileError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "CompileError";
  }
}
```

- [ ] **Step 4: Implement `src/compiler.ts`**

Create `src/compiler.ts` with this content:

```ts
import { parseDeck } from "./parser";
import { renderBlock } from "./render-block";
import type {
  CompileDeckInput,
  CompiledDeck,
  CompiledSlide,
  ComponentPlaceholder,
  DeckFrontmatter,
  SlideFrontmatter,
} from "./deck";
import { CompileError } from "./deck";
import type { SlideBlock } from "./types";

export async function compileMarkdown(input: CompileDeckInput): Promise<CompiledDeck> {
  const { attrs: deckAttrs, body } = readFrontmatter(input.markdown);
  assertSingleFileAssetRules(input, body);
  const parsed = parseDeck(body);

  const slides: CompiledSlide[] = parsed.slides.map((slide) => {
    const { attrs, body: slideBody } = readFrontmatter(slide.raw);
    const slideBlocks = parseDeck(slideBody).slides[0]?.blocks ?? [];
    const components = collectComponents(input.slug, slide.index, slideBlocks);
    const meta = toSlideFrontmatter(attrs, slide.title, slide.layout, slide.className);

    return {
      index: slide.index,
      meta,
      html: slideBlocks.map(renderBlock).join("\\n"),
      components,
      notes: meta.notes,
    };
  });

  return {
    slug: input.slug,
    sourcePath: input.sourcePath,
    kind: input.kind,
    meta: toDeckFrontmatter(deckAttrs),
    slides,
    assets: [],
    warnings: parsed.warnings.map((message) => ({ code: "parse-warning", message })),
  };
}

function collectComponents(slug: string, slideIndex: number, blocks: SlideBlock[]): ComponentPlaceholder[] {
  return blocks
    .filter((block): block is Extract<SlideBlock, { type: "component" }> => block.type === "component")
    .map((block, componentIndex) => ({
      id: `${slug}-${slideIndex}-${componentIndex}`,
      name: block.name,
      props: block.props,
      source: block.raw,
    }));
}

function readFrontmatter(source: string): { attrs: Record<string, unknown>; body: string } {
  const normalized = source.replace(/\\r\\n/g, "\\n").trimStart();
  if (!normalized.startsWith("---\\n")) return { attrs: {}, body: source.trim() };

  const end = normalized.indexOf("\\n---", 4);
  if (end === -1) throw new CompileError("Frontmatter block is not closed.", "frontmatter-unclosed");

  const rawAttrs = normalized.slice(4, end).trim();
  const body = normalized.slice(end + 4).replace(/^\\n/, "").trim();
  return { attrs: parseFrontmatterAttrs(rawAttrs), body };
}

function parseFrontmatterAttrs(source: string): Record<string, unknown> {
  const attrs: Record<string, unknown> = {};
  const lines = source.split("\\n");

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const match = /^([A-Za-z_][A-Za-z0-9_-]*):\\s*(.*)$/.exec(line);
    if (!match) continue;

    const key = match[1];
    const value = match[2];
    if (value === "|") {
      const block: string[] = [];
      i += 1;
      while (i < lines.length && /^\\s+/.test(lines[i])) {
        block.push(lines[i].trim());
        i += 1;
      }
      i -= 1;
      attrs[key] = block.join("\\n").trim();
      continue;
    }
    attrs[key] = parseScalar(value);
  }

  return attrs;
}

function parseScalar(value: string): unknown {
  const trimmed = value.trim().replace(/^['"]|['"]$/g, "");
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^\\[.*\\]$/.test(trimmed)) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean);
  }
  return trimmed;
}

function toDeckFrontmatter(attrs: Record<string, unknown>): DeckFrontmatter {
  const meta = { ...attrs };
  const deck: DeckFrontmatter = { meta };
  assignString(deck, meta, "title");
  assignString(deck, meta, "description");
  assignString(deck, meta, "author");
  assignString(deck, meta, "date");
  assignString(deck, meta, "theme");
  assignString(deck, meta, "assets");
  assignBoolean(deck, meta, "draft");
  assignBoolean(deck, meta, "presenter");
  const tags = meta.tags;
  if (Array.isArray(tags)) {
    deck.tags = tags.map(String);
    delete meta.tags;
  }
  return deck;
}

function toSlideFrontmatter(
  attrs: Record<string, unknown>,
  fallbackTitle?: string,
  fallbackLayout?: string,
  fallbackClassName?: string,
): SlideFrontmatter {
  const meta = { ...attrs };
  const slide: SlideFrontmatter = { title: fallbackTitle, layout: fallbackLayout, className: fallbackClassName, meta };
  assignString(slide, meta, "title");
  assignString(slide, meta, "layout");
  assignString(slide, meta, "notes");
  assignString(slide, meta, "background");
  assignString(slide, meta, "transition");
  const classValue = meta.class;
  if (typeof classValue === "string") {
    slide.className = classValue;
    delete meta.class;
  }
  return slide;
}

function assignString<T extends Record<string, unknown>>(target: T, meta: Record<string, unknown>, key: string): void {
  const value = meta[key];
  if (typeof value === "string") {
    target[key as keyof T] = value as T[keyof T];
    delete meta[key];
  }
}

function assignBoolean<T extends Record<string, unknown>>(target: T, meta: Record<string, unknown>, key: string): void {
  const value = meta[key];
  if (typeof value === "boolean") {
    target[key as keyof T] = value as T[keyof T];
    delete meta[key];
  }
}

function assertSingleFileAssetRules(input: CompileDeckInput, markdown: string): void {
  if (input.kind !== "single-file") return;
  if (/(?:src=|background:\\s*)["']?\\.\\//.test(markdown)) {
    throw new CompileError(
      `Single-file deck ${input.sourcePath} cannot reference local relative assets.`,
      "single-file-local-asset",
    );
  }
}
```

- [ ] **Step 5: Extract block rendering for compiler reuse**

Create `src/render-block.ts` by moving the `renderBlock`, `renderProps`, `inline`, and `escapeHtml` functions from `src/render.ts` into this file. Export `renderBlock`.

Then update `src/render.ts` to import `renderBlock`:

```ts
import type { Slide, SlideDeck } from "./types";
import { renderBlock } from "./render-block";

export function renderDeck(deck: SlideDeck): string {
  return deck.slides.map(renderSlide).join("\\n");
}

export function renderSlide(slide: Slide): string {
  const classes = ["slide", `layout-${safeClass(slide.layout)}`, slide.className ? safeClass(slide.className) : ""]
    .filter(Boolean)
    .join(" ");
  return `<section class="${classes}" data-slide-index="${slide.index}">${slide.blocks
    .map(renderBlock)
    .join("\\n")}</section>`;
}

function safeClass(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- test/compiler.test.ts`

Expected: PASS.

---

### Task 2: Single-file Relative Asset Compile Error

**Files:**
- Modify: `test/compiler.test.ts`
- Modify: `src/compiler.ts`

- [ ] **Step 1: Add failing test**

Append this test to `test/compiler.test.ts`:

```ts
it("rejects local relative assets in single-file decks", async () => {
  await expect(
    compileMarkdown({
      slug: "deck1",
      sourcePath: "decks/deck1.mdx",
      kind: "single-file",
      markdown: `# One

![Local](./image.png)`,
    }),
  ).rejects.toMatchObject({
    name: "CompileError",
    code: "single-file-local-asset",
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/compiler.test.ts`

Expected: FAIL because markdown image syntax is not detected by the single-file asset rule.

- [ ] **Step 3: Extend single-file asset validation**

Update `assertSingleFileAssetRules()` in `src/compiler.ts`:

```ts
function assertSingleFileAssetRules(input: CompileDeckInput, markdown: string): void {
  if (input.kind !== "single-file") return;
  if (/(?:src=|background:\\s*)["']?\\.\\//.test(markdown) || /!\\[[^\\]]*\\]\\(\\.\\//.test(markdown)) {
    throw new CompileError(
      `Single-file deck ${input.sourcePath} cannot reference local relative assets.`,
      "single-file-local-asset",
    );
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- test/compiler.test.ts`

Expected: PASS.

---

### Task 3: Public Exports And Regression

**Files:**
- Modify: `src/mod.ts`
- Modify: `test/compiler.test.ts`

- [ ] **Step 1: Add export smoke test**

Append this test to `test/compiler.test.ts`:

```ts
it("exports the compiler from the public module", async () => {
  const mod = await import("../src/mod");
  expect(typeof mod.compileMarkdown).toBe("function");
  expect(typeof mod.CompileError).toBe("function");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/compiler.test.ts`

Expected: FAIL because `src/mod.ts` does not export compiler API yet.

- [ ] **Step 3: Export compiler API**

Add these exports to `src/mod.ts`:

```ts
export { compileMarkdown } from "./compiler";
export { CompileError } from "./deck";
export type { CompileDeckInput, DeckCompiler } from "./deck";
```

- [ ] **Step 4: Run full quality gate**

Run: `npm run check`

Expected: PASS for typecheck and all tests.

- [ ] **Step 5: Commit**

```bash
git add src/deck.ts src/compiler.ts src/render-block.ts src/render.ts src/mod.ts test/compiler.test.ts
git commit -m "Add compiled deck compiler foundation"
```

---

## Plan Self-Review

Spec coverage for this slice:

- Deck-level frontmatter: Task 1.
- Slide-level frontmatter: Task 1.
- Markdown to HTML compilation using existing renderer semantics: Task 1.
- MDX component placeholders: Task 1.
- Single-file relative asset errors: Task 2.
- Public compiler exports: Task 3.

Deferred to separate slices:

- Filesystem manifest generation.
- Dev editor/save/HMR.
- Cloudflare Agent editing and Code Mode tools.
