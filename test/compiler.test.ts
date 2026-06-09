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

  it("exports the compiler from the public module", async () => {
    const mod = await import("../src/mod");
    expect(typeof mod.compileMarkdown).toBe("function");
    expect(typeof mod.CompileError).toBe("function");
  });
});
