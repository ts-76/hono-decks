import { Hono } from "hono";
import { compileMarkdown, honoSlides, honoSlidesRouter } from "hono-slides";
import type { DeckSource } from "hono-slides";

export { honoSlides, honoSlidesRouter };

interface Env {}

const sampleDeck = `---
title: Hono Slides
description: Hono + Cloudflare Workers で動く MDX-like slide runtime
---

---
title: Hono Slides
layout: cover
---

# Hono Slides

Cloudflare Workers で動く Slidev-like deck

<Hero title="MDX-like components" />

---
title: Parse and View
---

## Parse and View

- Markdown/MDX-like source を compile
- deck manifest と slide metadata を保持
- Hono route で viewer/render page を配信

---
layout: statement
---

## 次にやること

> 自分の deck source や asset pipeline を接続する`;

const app = new Hono<{ Bindings: Env }>();
const sampleDeckSource = createSampleDeckSource();

app.get("/", (c) => c.redirect("/decks"));
app.route(
  "/decks",
  honoSlidesRouter({
    source: sampleDeckSource,
  }),
);

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;

function createSampleDeckSource(): DeckSource {
  return {
    async listDecks() {
      const deck = await compileSampleDeck();
      return [
        {
          slug: deck.slug,
          title: deck.meta.title,
          description: deck.meta.description,
          draft: deck.meta.draft,
          sourcePath: deck.sourcePath,
        },
      ];
    },

    async getCompiledDeck(_c, slug) {
      if (slug !== "sample") return null;
      return compileSampleDeck();
    },
  };
}

function compileSampleDeck() {
  return compileMarkdown({
    slug: "sample",
    markdown: sampleDeck,
    sourcePath: "decks/sample.mdx",
    kind: "single-file",
  });
}
