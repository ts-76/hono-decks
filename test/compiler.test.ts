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
