import { Hono } from "hono";
import { routeAgentRequest } from "agents";
import { createDeckAgentInstanceName } from "./agent-contract";
import { buildSuggestion, SlideAssistant } from "./agent";
import { compileMarkdown } from "./compiler";
import { honoSlides } from "./middleware";
import { honoSlidesRouter } from "./router";
import type { DeckSource } from "./deck";
import type { AgentSuggestRequest, Env } from "./types";

export { SlideAssistant, honoSlides, honoSlidesRouter };

const sampleDeck = `title: Hono Slides
layout: cover

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

app.get("/", (c) => c.html(editorHtml(sampleDeck)));
app.get("/deck", honoSlides({ markdown: sampleDeck, title: "Hono Slides" }));
app.route("/decks", honoSlidesRouter({ source: sampleDeckSource, dev: false }));

app.post("/api/parse", honoSlides({ respond: false }), (c) => {
  return c.json({ deck: c.var.slideDeck, html: c.var.slideHtml });
});

app.post("/api/agent/suggest", async (c) => {
  const payload = (await c.req.json()) as AgentSuggestRequest;

  // Prefer the Cloudflare Agents Durable Object route when the binding is configured.
  const slug = payload.slug || "default";
  const sessionId = payload.sessionId || "default";
  const agentName = createDeckAgentInstanceName({ slug, sessionId });
  const agentUrl = new URL(`/agents/slide-assistant/${encodeURIComponent(agentName)}/suggest`, c.req.url);
  const agentResponse = await routeAgentRequest(new Request(agentUrl, { method: "POST", body: JSON.stringify(payload) }), c.env);
  if (agentResponse) return agentResponse;

  return c.json(await buildSuggestion(c.env, payload));
});

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

function editorHtml(initialMarkdown: string): string {
  const escaped = initialMarkdown.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Hono Slides</title>
  <link rel="stylesheet" href="/style.css" />
</head>
<body>
  <header class="topbar">
    <div>
      <p class="eyebrow">Hono + Cloudflare Workers</p>
      <h1>Hono Slides</h1>
    </div>
    <button id="agentButton" type="button">Agent に改善案を聞く</button>
  </header>
  <main class="workspace">
    <section class="editorPane">
      <label for="instruction">Agent instruction</label>
      <input id="instruction" value="初心者向けに読みやすくして" />
      <label for="markdown">Deck Markdown / MDX-like</label>
      <textarea id="markdown" spellcheck="false">${escaped}</textarea>
    </section>
    <section class="previewPane">
      <div id="warnings" class="warnings"></div>
      <div id="agentOutput" class="agentOutput"></div>
      <div id="preview" class="deckPreview"></div>
    </section>
  </main>
  <script type="module" src="/app.js"></script>
</body>
</html>`;
}
