import { Hono } from "hono";
import { routeAgentRequest } from "agents";
import { buildSuggestion, SlideAssistant } from "./agent";
import { parseDeck } from "./parser";
import { renderDeck } from "./render";
import type { AgentSuggestRequest, Env } from "./types";

export { SlideAssistant };

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

app.use("/agents/*", async (c, next) => {
  const response = await routeAgentRequest(c.req.raw, c.env);
  if (response) return response;
  return next();
});

app.get("/", (c) => c.html(editorHtml(sampleDeck)));

app.post("/api/parse", async (c) => {
  const { markdown } = (await c.req.json()) as { markdown?: string };
  const deck = parseDeck(markdown ?? "");
  return c.json({ deck, html: renderDeck(deck) });
});

app.post("/api/agent/suggest", async (c) => {
  const payload = (await c.req.json()) as AgentSuggestRequest;

  // Prefer the Cloudflare Agents Durable Object route when the binding is configured.
  const agentUrl = new URL("/agents/slide-assistant/default/suggest", c.req.url);
  const agentResponse = await routeAgentRequest(new Request(agentUrl, { method: "POST", body: JSON.stringify(payload) }), c.env);
  if (agentResponse) return agentResponse;

  return c.json(await buildSuggestion(c.env, payload));
});

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;

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
