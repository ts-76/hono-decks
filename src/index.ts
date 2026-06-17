import { Hono } from "hono";
import { routeAgentRequest } from "agents";
import { SlideAssistant } from "./agent/index";
import { createCloudflareDeckAgentChat } from "./agent/cloudflare-chat";
import { compileMarkdown } from "./deck/compiler";
import { honoSlides } from "./server/middleware";
import { honoSlidesRouter } from "./server/router";
import { createPreviewEventHub } from "./runtime/preview-events";
import type { DeckSource, LocalDeckIO } from "./deck/model";
import type { Env } from "./shared/types";

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
const previewEvents = createPreviewEventHub();
let sampleDeckMarkdown = sampleDeck;
const sampleDeckSource = createSampleDeckSource();
const sampleLocalDeckIO = createSampleLocalDeckIO();
const sampleAgentChat = createCloudflareDeckAgentChat({
  agentPath: "slide-assistant",
  routeAgentRequest,
});

app.use("/agents/*", async (c, next) => {
  const response = await routeAgentRequest(c.req.raw, c.env);
  if (response) return response;
  return next();
});

app.get("/", (c) => c.redirect("/decks"));
app.route(
  "/decks",
  honoSlidesRouter({
    source: sampleDeckSource,
    dev: true,
    localDeckIO: sampleLocalDeckIO,
    previewEvents,
    onFileChange(event) {
      previewEvents.publish({ type: "deck:updated", slug: event.slug ?? "", data: { source: "sample", path: event.path } });
    },
    agentChat: (input, c) =>
      sampleAgentChat(
        {
          ...input,
          useWorkersAI: isWorkersAIEnabled(c.env),
        },
        c,
      ),
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

function createSampleLocalDeckIO(): LocalDeckIO {
  return {
    async listFiles() {
      return [{ slug: "sample", sourcePath: "decks/sample.mdx", kind: "single-file" }];
    },

    async readMarkdown(slug) {
      return slug === "sample" ? sampleDeckMarkdown : null;
    },

    async writeMarkdown(slug, markdown) {
      if (slug !== "sample") throw new Error(`Unknown sample deck slug: "${slug}"`);
      sampleDeckMarkdown = markdown;
    },
  };
}

function compileSampleDeck() {
  return compileMarkdown({
    slug: "sample",
    markdown: sampleDeckMarkdown,
    sourcePath: "decks/sample.mdx",
    kind: "single-file",
  });
}

function isWorkersAIEnabled(env: Env | undefined): boolean {
  return env?.HONO_SLIDES_USE_WORKERS_AI !== "false";
}
