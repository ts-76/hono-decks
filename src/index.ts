import { Hono } from "hono";
import { compileMarkdown } from "./deck/compiler";
import { honoSlides } from "./server/middleware";
import { honoSlidesRouter } from "./server/router";
import type { DeckSource } from "./deck/model";
import type { Env } from "./shared/types";

export { honoSlides, honoSlidesRouter };

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
title: Editing
---

## 編集ページ

- Markdown を入力
- 即プレビュー
- Agents に編集支援を委譲

---
layout: statement
---

## 次にやること

> 自分の AI binding / MCP / tools を Agent に接続する`;

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
