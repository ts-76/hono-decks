import { describe, expect, it } from "vite-plus/test";
import { compileMarkdown } from "../src/compiler/compiler";

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
    expect(deck.slides[0].html).toContain('class="mdx-hero');
    expect(deck.slides[0].html).toContain("<h1>Hello</h1>");
    expect(deck.slides[0].html).not.toContain("mdx-component");
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
    expect(deck.warnings).toEqual(
      expect.arrayContaining([
        {
          code: "unknown-frontmatter-key",
          message: 'Unknown deck frontmatter key "customDeckKey" is preserved in meta.',
        },
        {
          code: "unknown-frontmatter-key",
          message: 'Unknown slide frontmatter key "customSlideKey" is preserved in meta.',
          slideIndex: 1,
        },
      ]),
    );
    expect(deck.warnings).not.toEqual(
      expect.arrayContaining([
        {
          code: "unsupported-mdx-component",
          message: 'MDX component "Hero" is rendered as a placeholder.',
          slideIndex: 0,
        },
      ]),
    );
  });

  it("parses MDX comments as speaker notes and removes them from visible slide content", async () => {
    const deck = await compileMarkdown({
      slug: "deck1",
      sourcePath: "decks/deck1/deck.mdx",
      kind: "directory",
      markdown: `# Intro

{/* Remind the audience this runs on Workers. */}

Visible slide content.

{/* Mention that speaker notes stay out of the projection. */}
`,
    });

    expect(deck.slides[0].notes).toBe(
      "Remind the audience this runs on Workers.\n\nMention that speaker notes stay out of the projection.",
    );
    expect(deck.slides[0].html).toContain("Visible slide content.");
    expect(deck.slides[0].html).not.toContain("Remind the audience");
    expect(deck.slides[0].html).not.toContain("speaker notes stay out");
  });

  it("assigns content types to query and hash frontmatter asset refs", async () => {
    const deck = await compileMarkdown({
      slug: "deck1",
      sourcePath: "decks/deck1/deck.mdx",
      kind: "directory",
      markdown: `---
title: Asset Types
assets:
  - https://cdn.example.com/front.png?v=1
  - /public/front.svg#icon
---

# Asset Types`,
    });

    expect(deck.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourcePath: "https://cdn.example.com/front.png?v=1",
          publicPath: "https://cdn.example.com/front.png?v=1",
          type: "remote",
          contentType: "image/png",
        }),
        expect.objectContaining({
          sourcePath: "/public/front.svg#icon",
          publicPath: "/public/front.svg#icon",
          type: "public",
          contentType: "image/svg+xml",
        }),
      ]),
    );
  });

  it("compiles MDX JSX components with children into serializable slide nodes", async () => {
    const deck = await compileMarkdown({
      slug: "deck1",
      sourcePath: "decks/deck1/deck.mdx",
      kind: "directory",
      markdown: `# Component Slide

<Columns gap="wide">
  <div>Left **side**</div>
  <div>Right</div>
</Columns>`,
    });

    expect(deck.slides[0].nodes).toEqual([
      {
        type: "element",
        tag: "h1",
        props: {},
        children: [{ type: "text", value: "Component Slide" }],
      },
      {
        type: "component",
        name: "Columns",
        props: { gap: "wide" },
        children: [
          {
            type: "element",
            tag: "div",
            props: {},
            children: [
              { type: "text", value: "Left " },
              {
                type: "element",
                tag: "strong",
                props: {},
                children: [{ type: "text", value: "side" }],
              },
            ],
          },
          {
            type: "element",
            tag: "div",
            props: {},
            children: [{ type: "text", value: "Right" }],
          },
        ],
      },
    ]);
    expect(deck.slides[0].html).toContain("mdx-component");
    expect(deck.slides[0].components).toEqual([
      {
        id: "deck1-0-0",
        name: "Columns",
        props: { gap: "wide" },
        source: expect.stringContaining("<Columns"),
      },
    ]);
  });

  it("preserves known transition frontmatter", async () => {
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
---

- First
- Second
`,
    });

    expect(deck.slides[0].meta.transition).toBe("fade");
  });

  it("applies deck-level transition as a slide fallback and lets slides override it", async () => {
    const deck = await compileMarkdown({
      slug: "motion",
      sourcePath: "decks/motion/deck.mdx",
      kind: "directory",
      markdown: `---
title: Motion
transition: slide-left
---

# Uses deck default

---
title: Override
transition: fade-out
---

## Override
`,
    });

    expect(deck.meta.transition).toBe("slide-left");
    expect(deck.slides[0].meta.transition).toBe("slide-left");
    expect(deck.slides[1].meta.transition).toBe("fade-out");
    expect(deck.warnings).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "unknown-transition" })]),
    );
  });

  it("applies deck-level transition timing as slide fallbacks and lets slides override them", async () => {
    const deck = await compileMarkdown({
      slug: "motion",
      sourcePath: "decks/motion/deck.mdx",
      kind: "directory",
      markdown: `---
title: Motion
transitionDuration: 420ms
transitionEasing: cubic-bezier(.2, 0, 0, 1)
---

# Uses deck timing

---
title: Override
transitionDuration: 160ms
transitionEasing: ease-out
---

## Override
`,
    });

    expect(deck.meta.transitionDuration).toBe("420ms");
    expect(deck.meta.transitionEasing).toBe("cubic-bezier(.2, 0, 0, 1)");
    expect(deck.slides[0].meta.transitionDuration).toBe("420ms");
    expect(deck.slides[0].meta.transitionEasing).toBe("cubic-bezier(.2, 0, 0, 1)");
    expect(deck.slides[1].meta.transitionDuration).toBe("160ms");
    expect(deck.slides[1].meta.transitionEasing).toBe("ease-out");
  });

  it("warns and falls back for invalid transition timing frontmatter", async () => {
    const deck = await compileMarkdown({
      slug: "motion",
      sourcePath: "decks/motion/deck.mdx",
      kind: "directory",
      markdown: `---
title: Motion
transitionDuration: fast
transitionEasing: spring(1)
---

# Invalid deck timing

---
title: Slide fallback
---

## Slide fallback

---
title: Invalid slide timing
transitionDuration: 12px
transitionEasing: bounce
---

## Invalid slide timing
`,
    });

    expect(deck.meta.transitionDuration).toBeUndefined();
    expect(deck.meta.transitionEasing).toBeUndefined();
    expect(deck.slides[0].meta.transitionDuration).toBeUndefined();
    expect(deck.slides[0].meta.transitionEasing).toBeUndefined();
    expect(deck.slides[1].meta.transitionDuration).toBeUndefined();
    expect(deck.slides[1].meta.transitionEasing).toBeUndefined();
    expect(deck.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "invalid-transition-duration" }),
        expect.objectContaining({ code: "invalid-transition-easing" }),
        expect.objectContaining({ code: "invalid-transition-duration", slideIndex: 2 }),
        expect.objectContaining({ code: "invalid-transition-easing", slideIndex: 2 }),
      ]),
    );
  });

  it("falls back for removed and unknown transition values", async () => {
    const deck = await compileMarkdown({
      slug: "motion",
      sourcePath: "decks/motion/deck.mdx",
      kind: "directory",
      markdown: `---
title: Motion
transition: zoom
---

# Removed deck transition

---
title: Removed slide transition
transition: slide
---

## Removed slide transition

---
title: Unknown slide transition
transition: spin
---

## Unknown slide transition
`,
    });

    expect(deck.meta.transition).toBe("none");
    expect(deck.slides[0].meta.transition).toBe("none");
    expect(deck.slides[1].meta.transition).toBe("none");
    expect(deck.slides[2].meta.transition).toBe("none");
    expect(deck.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "unknown-transition" }),
        expect.objectContaining({ code: "unknown-transition", slideIndex: 1 }),
        expect.objectContaining({ code: "unknown-transition", slideIndex: 2 }),
      ]),
    );
  });

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

  it("rejects malformed frontmatter lines", async () => {
    await expect(
      compileMarkdown({
        slug: "deck1",
        sourcePath: "decks/deck1.mdx",
        kind: "single-file",
        markdown: `---
title Hono Slides
---

# One`,
      }),
    ).rejects.toMatchObject({
      name: "CompileError",
      code: "frontmatter-invalid-line",
      message: 'Invalid frontmatter line 1: "title Hono Slides"',
    });

    await expect(
      compileMarkdown({
        slug: "deck1",
        sourcePath: "decks/deck1/deck.mdx",
        kind: "directory",
        markdown: `# One

---
title: Two
broken line
---

## Two`,
      }),
    ).rejects.toMatchObject({
      name: "CompileError",
      code: "frontmatter-invalid-line",
      message: 'Invalid frontmatter line 2: "broken line"',
    });
  });

  it("rejects unclosed slide frontmatter blocks", async () => {
    await expect(
      compileMarkdown({
        slug: "deck1",
        sourcePath: "decks/deck1/deck.mdx",
        kind: "directory",
        markdown: `# One

---
title: Two

## Two`,
      }),
    ).rejects.toMatchObject({
      name: "CompileError",
      code: "frontmatter-unclosed",
      message: "Frontmatter block is not closed.",
    });
  });

  it("rejects parent and bare local asset references in single-file decks", async () => {
    await expect(
      compileMarkdown({
        slug: "deck1",
        sourcePath: "decks/deck1.mdx",
        kind: "single-file",
        markdown: `---
background: ../hero.png
---

# One`,
      }),
    ).rejects.toMatchObject({ code: "single-file-local-asset" });

    await expect(
      compileMarkdown({
        slug: "deck1",
        sourcePath: "decks/deck1.mdx",
        kind: "single-file",
        markdown: `# One

![Local](image.png)`,
      }),
    ).rejects.toMatchObject({ code: "single-file-local-asset" });
  });

  it("collects remote and public asset references without embedding bodies", async () => {
    const deck = await compileMarkdown({
      slug: "deck1",
      sourcePath: "decks/deck1.mdx",
      kind: "single-file",
      markdown: `---
background: /public/hero.jpg
---

# One

![Logo](https://cdn.example.com/logo.png)

![Public](/public/diagram.svg)

<Hero image="r2://slides-bucket/hero.webp" />`,
    });

    expect(deck.assets).toEqual([
      {
        sourcePath: "/public/hero.jpg",
        publicPath: "/public/hero.jpg",
        type: "public",
        contentType: "image/jpeg",
      },
      {
        sourcePath: "https://cdn.example.com/logo.png",
        publicPath: "https://cdn.example.com/logo.png",
        type: "remote",
        contentType: "image/png",
      },
      {
        sourcePath: "/public/diagram.svg",
        publicPath: "/public/diagram.svg",
        type: "public",
        contentType: "image/svg+xml",
      },
      {
        sourcePath: "r2://slides-bucket/hero.webp",
        publicPath: "r2://slides-bucket/hero.webp",
        type: "r2",
        contentType: "image/webp",
      },
    ]);
    expect(deck.warnings).toEqual(
      expect.arrayContaining([
        {
          code: "external-asset-unverified",
          message: "Remote asset existence cannot be verified at compile time: https://cdn.example.com/logo.png",
        },
        {
          code: "external-asset-unverified",
          message: "R2 asset existence cannot be verified at compile time: r2://slides-bucket/hero.webp",
        },
      ]),
    );
    expect(deck.warnings).not.toContainEqual({
      code: "external-asset-unverified",
      message: "Public asset existence cannot be verified at compile time: /public/diagram.svg",
    });
  });

  it("collects external asset references from deck frontmatter assets", async () => {
    const deck = await compileMarkdown({
      slug: "deck1",
      sourcePath: "decks/deck1.mdx",
      kind: "single-file",
      markdown: `---
assets: [https://cdn.example.com/front.png, r2://slides-bucket/front.webp, /public/front.svg]
---

# One`,
    });

    expect(deck.meta.assets).toEqual([
      "https://cdn.example.com/front.png",
      "r2://slides-bucket/front.webp",
      "/public/front.svg",
    ]);
    expect(deck.assets).toEqual([
      {
        sourcePath: "https://cdn.example.com/front.png",
        publicPath: "https://cdn.example.com/front.png",
        type: "remote",
        contentType: "image/png",
      },
      {
        sourcePath: "r2://slides-bucket/front.webp",
        publicPath: "r2://slides-bucket/front.webp",
        type: "r2",
        contentType: "image/webp",
      },
      {
        sourcePath: "/public/front.svg",
        publicPath: "/public/front.svg",
        type: "public",
        contentType: "image/svg+xml",
      },
    ]);
  });

  it("supports multiline frontmatter lists and shallow metadata objects", async () => {
    const deck = await compileMarkdown({
      slug: "deck1",
      sourcePath: "decks/deck1.mdx",
      kind: "single-file",
      markdown: `---
title: Multiline Meta
tags:
  - hono
  - workers
assets:
  - https://cdn.example.com/front.png
  - /public/front.svg
custom:
  intent: demo
  priority: high
---

# One`,
    });

    expect(deck.meta).toMatchObject({
      title: "Multiline Meta",
      tags: ["hono", "workers"],
      assets: ["https://cdn.example.com/front.png", "/public/front.svg"],
      meta: {
        custom: {
          intent: "demo",
          priority: "high",
        },
      },
    });
    expect(deck.assets).toEqual([
      {
        sourcePath: "https://cdn.example.com/front.png",
        publicPath: "https://cdn.example.com/front.png",
        type: "remote",
        contentType: "image/png",
      },
      {
        sourcePath: "/public/front.svg",
        publicPath: "/public/front.svg",
        type: "public",
        contentType: "image/svg+xml",
      },
    ]);
  });

  it("rejects local relative frontmatter assets in single-file decks", async () => {
    await expect(
      compileMarkdown({
        slug: "deck1",
        sourcePath: "decks/deck1.mdx",
        kind: "single-file",
        markdown: `---
assets: [./image.png]
---

# One`,
      }),
    ).rejects.toMatchObject({ code: "single-file-local-asset" });
  });

  it("preserves parser warnings on compiled decks", async () => {
    const deck = await compileMarkdown({
      slug: "deck1",
      sourcePath: "decks/deck1/deck.mdx",
      kind: "directory",
      markdown: `# One

\`\`\`ts
const unclosed = true;`,
    });

    expect(deck.warnings).toContainEqual({
      code: "parse-warning",
      message: "Slide 1: code fence is not closed.",
      slideIndex: 0,
    });
  });

  it("does not execute MDX imports exports or JavaScript expressions", async () => {
    const deck = await compileMarkdown({
      slug: "deck1",
      sourcePath: "decks/deck1/deck.mdx",
      kind: "directory",
      markdown: `import Secret from "./secret"

# One

{1 + 1}

<Hero title="Safe" count={1} />`,
    });

    expect(deck.slides[0].nodes).toEqual([
      {
        type: "element",
        tag: "h1",
        props: {},
        children: [{ type: "text", value: "One" }],
      },
      {
        type: "component",
        name: "Hero",
        props: { title: "Safe" },
        children: [],
      },
    ]);
    expect(deck.warnings).toEqual(
      expect.arrayContaining([
        {
          code: "parse-warning",
          message: "Slide 1: MDX import/export syntax is ignored.",
          slideIndex: 0,
        },
        {
          code: "parse-warning",
          message: "Slide 1: MDX JavaScript expressions are ignored.",
          slideIndex: 0,
        },
        {
          code: "parse-warning",
          message: "Slide 1: MDX JavaScript expression props are ignored on Hero.count.",
          slideIndex: 0,
        },
      ]),
    );
  });

  it("exports the compiler from the public module", async () => {
    const mod = await import("../src/node");
    expect(typeof mod.compileMarkdown).toBe("function");
    expect(typeof mod.CompileError).toBe("function");
    expect(typeof mod.RenderError).toBe("function");
  });
});
