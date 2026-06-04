import { Hono } from "hono";
import { routeAgentRequest } from "agents";
import { SlideAssistant } from "./agent";
import { compileMarkdown } from "./compiler";
import { honoSlides } from "./middleware";
import { honoSlidesRouter } from "./router";
import type { DeckSource } from "./deck";
import type { Env } from "./types";

export { SlideAssistant, honoSlides, honoSlidesRouter };

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

## 編集ページ

- Markdown を入力
- 即プレビュー
- Agents に編集支援を委譲

---
layout: statement

## 次にやること

> 自分の AI binding / MCP / tools を Agent に接続する`;

const app = new Hono<{ Bindings: Env }>();
const sampleDeckSource = createSampleDeckSource();

app.use("/agents/*", async (c, next) => {
  const response = await routeAgentRequest(c.req.raw, c.env);
  if (response) return response;
  return next();
});

app.get("/", (c) => c.redirect("/decks"));
app.route("/decks", honoSlidesRouter({ source: sampleDeckSource, dev: false }));

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;

function createSampleDeckSource(): DeckSource {
  return {
    async listDecks() {
      return [{ slug: "sample", title: "Hono Slides", sourcePath: "decks/sample.mdx" }];
    },

    async getCompiledDeck(_c, slug) {
      if (slug !== "sample") return null;
      return compileMarkdown({
        slug,
        markdown: sampleDeck,
        sourcePath: "decks/sample.mdx",
        kind: "single-file",
      });
    },
  };
}
