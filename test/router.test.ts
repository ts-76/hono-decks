import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { createDeckMarkdownHash } from "../src/agent-contract";
import type { CompiledDeck, LocalDeckIO } from "../src/deck";
import { manifestDeckSource } from "../src/manifest-source";
import { createPreviewEventHub } from "../src/preview-events";
import { honoSlidesRouter } from "../src/router";

const deck = {
  slug: "deck1",
  sourcePath: "decks/deck1/deck.mdx",
  kind: "directory",
  meta: { title: "Deck One", draft: false, meta: {} },
  slides: [{ index: 0, meta: { title: "Intro", layout: "cover", meta: {} }, html: "<h1>Intro</h1>", components: [] }],
  assets: [
    {
      sourcePath: "decks/deck1/assets/image.png",
      publicPath: "/decks/deck1/assets/image.png",
      type: "local",
      contentType: "image/png",
      body: new Uint8Array([9, 8, 7]),
    },
  ],
  warnings: [],
} satisfies CompiledDeck;

describe("honoSlidesRouter", () => {
  it("serves an index and an iframe viewer wrapper under the mount path", async () => {
    const app = new Hono();
    app.route("/slides", honoSlidesRouter({ source: manifestDeckSource({ decks: [deck] }), dev: false }));

    const index = await app.request("/slides");
    expect(index.status).toBe(200);
    expect(await index.text()).toContain("/slides/deck1");

    const response = await app.request("/slides/deck1");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    const html = await response.text();
    expect(html).toContain('data-hono-slides-viewer');
    expect(html).toContain('src="/slides/deck1/render"');
    expect(html).toContain('width="1920"');
    expect(html).toContain('height="1080"');
    expect(html).toContain("Math.min");
    expect(html).toContain('data-action="previous"');
    expect(html).toContain('data-action="next"');
    expect(html).toContain('data-action="fullscreen"');
    expect(html).toContain('type: "hono-slides:command"');
    expect(html).toContain("contentWindow?.postMessage");
    expect(html).toContain("requestFullscreen");
    expect(html).toContain("function viewerClick");
    expect(html).not.toContain('data-action="presentation"');
    expect(html).not.toContain("/presentation");
    expect(html).not.toContain('<aside data-hono-slides-chat');
    expect(html).not.toContain("/agent/chat");
    expect(html).not.toContain("/apply");
    expect(html).not.toContain('allowfullscreen');
    expect(html).not.toContain('sendCommand("fullscreen")');
    expect(html).not.toContain("<h1>Intro</h1>");
  });

  it("does not add a development Agent chat panel to the public deck viewer when chat is configured", async () => {
    const app = new Hono();
    app.route(
      "/slides",
      honoSlidesRouter({
        source: manifestDeckSource({ decks: [deck] }),
        dev: true,
        localDeckIO: createMemoryDeckIO({ deck1: "# Raw Deck" }),
        agentChat: async () => ({ source: "test", suggestion: "Tighten the title." }),
      }),
    );

    const response = await app.request("/slides/deck1");
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('src="/slides/deck1/render"');
    expect(html).not.toContain('data-hono-slides-chat');
    expect(html).not.toContain("/agent/chat");
    expect(html).not.toContain("/apply");
  });

  it("does not add a development Agent chat panel when chat is not configured", async () => {
    const app = new Hono();
    app.route(
      "/slides",
      honoSlidesRouter({
        source: manifestDeckSource({ decks: [deck] }),
        dev: true,
        localDeckIO: createMemoryDeckIO({ deck1: "# Raw Deck" }),
      }),
    );

    const response = await app.request("/slides/deck1");
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).not.toContain('<aside data-hono-slides-chat');
    expect(html).not.toContain("/agent/chat");
  });

  it("serves the compiled deck on a fixed 1920x1080 render route", async () => {
    const app = new Hono();
    app.route("/slides", honoSlidesRouter({ source: manifestDeckSource({ decks: [deck] }), dev: false }));

    const response = await app.request("/slides/deck1/render");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    const html = await response.text();
    expect(html).toContain("<h1>Intro</h1>");
    expect(html).toContain("--hono-slides-width:1920px");
    expect(html).toContain("--hono-slides-height:1080px");
    expect(html).toContain(".hono-slides-stage{width:var(--hono-slides-width);height:var(--hono-slides-height)");
    expect(html).toContain('window.addEventListener("message"');
    expect(html).toContain('message.type !== "hono-slides:command"');
    expect(html).toContain('window.parent.postMessage({ type: "hono-slides:state"');
    expect(html).not.toContain('data-hono-slides-controls');
    expect(html).not.toContain('data-timer');
  });

  it("redirects the deprecated presentation route to the render route", async () => {
    const app = new Hono();
    app.route("/slides", honoSlidesRouter({ source: manifestDeckSource({ decks: [deck] }), dev: false }));

    const response = await app.request("/slides/deck1/presentation");

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/slides/deck1/render");
  });

  it("hides draft decks from production index and direct viewing routes", async () => {
    const draftDeck = {
      ...deck,
      slug: "draft",
      meta: { ...deck.meta, title: "Draft Deck", draft: true },
      assets: [
        {
          sourcePath: "decks/draft/assets/image.png",
          publicPath: "/slides/draft/assets/image.png",
          type: "local",
          contentType: "image/png",
          body: new Uint8Array([1, 2, 3]),
        },
      ],
    } satisfies CompiledDeck;
    const app = new Hono();
    app.route("/slides", honoSlidesRouter({ source: manifestDeckSource({ decks: [deck, draftDeck] }), dev: false }));

    const index = await app.request("/slides");
    expect(await index.text()).not.toContain("/slides/draft");

    const response = await app.request("/slides/draft");
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Deck not found", slug: "draft" });

    const presentation = await app.request("/slides/draft/render");
    expect(presentation.status).toBe(404);
    expect(await presentation.json()).toEqual({ error: "Deck not found", slug: "draft" });
  });

  it("hides draft deck assets in production", async () => {
    const draftDeck = {
      ...deck,
      slug: "draft",
      meta: { ...deck.meta, title: "Draft Deck", draft: true },
      assets: [
        {
          sourcePath: "decks/draft/assets/image.png",
          publicPath: "/slides/draft/assets/image.png",
          type: "local",
          contentType: "image/png",
          body: new Uint8Array([1, 2, 3]),
        },
      ],
    } satisfies CompiledDeck;
    const app = new Hono();
    app.route("/slides", honoSlidesRouter({ source: manifestDeckSource({ decks: [draftDeck] }), dev: false }));

    const response = await app.request("/slides/draft/assets/image.png");
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Asset not found", slug: "draft", assetPath: "image.png" });
  });

  it("shows draft decks in development mode", async () => {
    const draftDeck = {
      ...deck,
      slug: "draft",
      meta: { ...deck.meta, title: "Draft Deck", draft: true },
      assets: [
        {
          sourcePath: "decks/draft/assets/image.png",
          publicPath: "/slides/draft/assets/image.png",
          type: "local",
          contentType: "image/png",
          body: new Uint8Array([1, 2, 3]),
        },
      ],
    } satisfies CompiledDeck;
    const app = new Hono();
    app.route(
      "/slides",
      honoSlidesRouter({
        source: manifestDeckSource({ decks: [draftDeck] }),
        dev: true,
        localDeckIO: createMemoryDeckIO({ draft: "# Draft" }),
      }),
    );

    const index = await app.request("/slides");
    expect(await index.text()).toContain("/slides/draft");

    const response = await app.request("/slides/draft");
    expect(response.status).toBe(200);

    const presentation = await app.request("/slides/draft/render");
    expect(presentation.status).toBe(200);
    expect(await presentation.text()).toContain("Draft Deck");

    const asset = await app.request("/slides/draft/assets/image.png");
    expect(asset.status).toBe(200);
  });

  it("adds a development live reload script to deck pages only when dev is true", async () => {
    const production = new Hono();
    production.route("/decks", honoSlidesRouter({ source: manifestDeckSource({ decks: [deck] }), dev: false }));
    const development = new Hono();
    development.route(
      "/decks",
      honoSlidesRouter({
        source: manifestDeckSource({ decks: [deck] }),
        dev: true,
        localDeckIO: createMemoryDeckIO({ deck1: "# Raw Deck" }),
      }),
    );

    const productionHtml = await (await production.request("/decks/deck1/render")).text();
    const developmentWrapperHtml = await (await development.request("/decks/deck1")).text();
    const developmentHtml = await (await development.request("/decks/deck1/render")).text();

    expect(productionHtml).not.toContain("new EventSource");
    expect(developmentWrapperHtml).not.toContain("new EventSource");
    expect(developmentWrapperHtml).toContain('src="/decks/deck1/render"');
    expect(developmentHtml).toContain("new EventSource");
    expect(developmentHtml).toContain('const eventsUrl = "/decks/deck1/edit/events"');
    expect(developmentHtml).toContain('events.addEventListener("deck:updated"');
    expect(developmentHtml).toContain("location.reload()");
    expect(developmentHtml).not.toContain("setInterval");
    expect(developmentHtml).not.toContain("fetch(eventsUrl");
  });

  it("serves local deck assets and returns 404 for missing slugs", async () => {
    const app = new Hono();
    app.route("/decks", honoSlidesRouter({ source: manifestDeckSource({ decks: [deck] }), dev: false }));

    const asset = await app.request("/decks/deck1/assets/image.png");
    expect(asset.status).toBe(200);
    expect(asset.headers.get("content-type")).toBe("image/png");

    const missing = await app.request("/decks/missing");
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: "Deck not found", slug: "missing" });
  });

  it("preserves nested asset paths that repeat the route marker", async () => {
    const source = manifestDeckSource({
      decks: [
        {
          ...deck,
          assets: [
            {
              sourcePath: "decks/deck1/assets/foo/deck1/assets/bar.png",
              publicPath: "/decks/deck1/assets/foo/deck1/assets/bar.png",
              type: "local",
              contentType: "image/png",
              body: new Uint8Array([1]),
            },
          ],
        },
      ],
    });
    const app = new Hono();
    app.route("/decks", honoSlidesRouter({ source, dev: false }));

    const response = await app.request("/decks/deck1/assets/foo/deck1/assets/bar.png");

    expect(response.status).toBe(200);
    expect(await response.arrayBuffer()).toEqual(new Uint8Array([1]).buffer);
  });

  it("does not expose development routes when dev is false", async () => {
    const app = new Hono();
    app.route("/decks", honoSlidesRouter({ source: manifestDeckSource({ decks: [deck] }), dev: false }));

    expect((await app.request("/decks/deck1/edit")).status).toBe(404);
    expect((await app.request("/decks/deck1/edit/events")).status).toBe(404);
    expect((await app.request("/decks/deck1/edit/save", { method: "POST" })).status).toBe(404);
    expect((await app.request("/decks/deck1/edit/agent/chat", { method: "POST" })).status).toBe(404);
    expect((await app.request("/decks/deck1/edit/apply", { method: "POST" })).status).toBe(404);
  });

  it("serves a development editor page with raw markdown when dev is true", async () => {
    const app = new Hono();
    app.route(
      "/decks",
      honoSlidesRouter({
        source: manifestDeckSource({ decks: [deck] }),
        dev: true,
        localDeckIO: createMemoryDeckIO({ deck1: "# Raw Deck" }),
      }),
    );

    const response = await app.request("/decks/deck1/edit");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    const html = await response.text();
    expect(html).toContain("# Raw Deck");
    expect(html).toContain('id="markdown"');
    expect(html).toContain('id="editorTabsMount"');
    expect(html).toContain("data-hono-jsx-dom-tabs");
    expect(html).toContain('id="agentPanel"');
    expect(html).toContain('id="mdxPanel"');
    expect(html).toContain('src="/editor-tabs.js"');
    expect(html).toContain('id="instruction"');
    expect(html).toContain('id="agentChatForm"');
    expect(html).toContain('id="agentMessages"');
    expect(html).not.toContain('id="chatModeButton"');
    expect(html).not.toContain('id="editModeButton"');
    expect(html).not.toContain("data-agent-mode");
    expect(html).toContain('id="agentButton"');
    expect(html).toContain('id="proposalCard"');
    expect(html).toContain('id="proposalSummary"');
    expect(html).toContain('id="proposalChanges"');
    expect(html).toContain('id="applyProposalButton"');
    expect(html).toContain('id="previewFrame"');
    expect(html).toContain('id="previewViewport"');
    expect(html).toContain('id="previewStage"');
    expect(html).toContain('src="/decks/deck1/render?live=0"');
    expect(html).toContain('width="1920"');
    expect(html).toContain('height="1080"');
    expect(html).toContain('href="/decks/deck1/render"');
    expect(html).toContain("reloadPreview()");
    expect(html).toContain("function resizePreview()");
    expect(html).toContain("previewFrameUrl");
    expect(html).toContain('fetch(saveUrl');
    expect(html).toContain('fetch(agentUrl');
    expect(html).toContain("getOrCreateAgentSessionId()");
    expect(html).toContain("appendChatMessage");
    expect(html).toContain("renderProposalChanges");
    expect(html).toContain("変更前");
    expect(html).toContain("変更後");
    expect(html).toContain("renderProposalCard");
    expect(html).toContain("sessionId");
    expect(html).toContain("markdown: markdown.value");
    expect(html).toContain('fetch(applyUrl');
    expect(html).toContain("markdown.value = data.markdown");
    expect(html).toContain("proposal: pendingProposal, markdown: markdown.value");
    expect(html).toContain("/edit/agent/chat");
    expect(html).toContain("/edit/apply");
    expect(html).toContain("/edit/events");
    expect(html).toContain("new EventSource");
    expect(html).toContain('events.addEventListener("deck:updated"');
    expect(html).not.toContain("setInterval");
    expect(html).not.toContain("fetch(eventsUrl");
  });

  it("enables development routes in auto mode when LocalDeckIO is configured", async () => {
    const app = new Hono();
    app.route(
      "/decks",
      honoSlidesRouter({
        source: manifestDeckSource({ decks: [deck] }),
        dev: "auto",
        localDeckIO: createMemoryDeckIO({ deck1: "# Auto Raw Deck" }),
      }),
    );

    const response = await app.request("/decks/deck1/edit");

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("# Auto Raw Deck");
  });

  it("keeps development routes disabled in auto mode without LocalDeckIO", async () => {
    const app = new Hono();
    app.route(
      "/decks",
      honoSlidesRouter({
        source: manifestDeckSource({ decks: [deck] }),
        dev: "auto",
      }),
    );

    expect((await app.request("/decks/deck1/edit")).status).toBe(404);
  });

  it("saves raw markdown through LocalDeckIO when dev is true", async () => {
    const writes: Array<{ slug: string; markdown: string }> = [];
    const app = new Hono();
    app.route(
      "/decks",
      honoSlidesRouter({
        source: manifestDeckSource({ decks: [deck] }),
        dev: true,
        localDeckIO: createMemoryDeckIO({ deck1: "# Before" }, writes),
      }),
    );

    const response = await app.request("/decks/deck1/edit/save", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ markdown: "# After" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, slug: "deck1" });
    expect(writes).toEqual([{ slug: "deck1", markdown: "# After" }]);
  });

  it("serves a development event stream when dev is true", async () => {
    const app = new Hono();
    app.route(
      "/decks",
      honoSlidesRouter({
        source: manifestDeckSource({ decks: [deck] }),
        dev: true,
        localDeckIO: createMemoryDeckIO({ deck1: "# Raw Deck" }),
      }),
    );

    const response = await app.request("/decks/deck1/edit/events?once=1");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(await response.text()).toContain("event: ready");
  });

  it("streams live preview events without client polling", async () => {
    const previewEvents = createPreviewEventHub();
    const app = new Hono();
    app.route(
      "/decks",
      honoSlidesRouter({
        source: manifestDeckSource({ decks: [deck] }),
        dev: true,
        localDeckIO: createMemoryDeckIO({ deck1: "# Raw Deck" }),
        previewEvents,
      }),
    );

    const controller = new AbortController();
    const response = await app.request("/decks/deck1/edit/events", { signal: controller.signal });
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Expected SSE response body");
    const decoder = new TextDecoder();

    const ready = await reader.read();
    expect(decoder.decode(ready.value)).toContain("event: ready");

    previewEvents.publish({ type: "deck:updated", slug: "deck1", data: { source: "watch" } });
    const update = await reader.read();
    expect(decoder.decode(update.value)).toContain("event: deck:updated");
    expect(decoder.decode(update.value)).toContain('"source":"watch"');

    await reader.cancel();
    controller.abort();
  });

  it("streams pending preview events from the Hono-owned event hub", async () => {
    const previewEvents = createPreviewEventHub();
    previewEvents.publish({ type: "deck:updated", slug: "deck1", data: { source: "watch" } });
    previewEvents.publish({ type: "deck:updated", slug: "other", data: { source: "watch" } });
    const app = new Hono();
    app.route(
      "/decks",
      honoSlidesRouter({
        source: manifestDeckSource({ decks: [deck] }),
        dev: true,
        localDeckIO: createMemoryDeckIO({ deck1: "# Raw Deck" }),
        previewEvents,
      }),
    );

    const response = await app.request("/decks/deck1/edit/events?once=1");
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toContain("event: ready");
    expect(text).toContain("event: deck:updated");
    expect(text).toContain('"source":"watch"');
    expect(text).not.toContain('"slug":"other"');
  });

  it("drains only preview events for the requested slug", async () => {
    const previewEvents = createPreviewEventHub();
    previewEvents.publish({ type: "deck:updated", slug: "deck1", data: { source: "watch" } });
    previewEvents.publish({ type: "deck:updated", slug: "other", data: { source: "watch" } });
    const app = new Hono();
    app.route(
      "/decks",
      honoSlidesRouter({
        source: manifestDeckSource({ decks: [deck] }),
        dev: true,
        localDeckIO: createMemoryDeckIO({ deck1: "# Raw Deck" }),
        previewEvents,
      }),
    );

    await app.request("/decks/deck1/edit/events?once=1");

    const deck1Again = await app.request("/decks/deck1/edit/events?once=1");
    expect(await deck1Again.text()).not.toContain("event: deck:updated");

    const other = await app.request("/decks/other/edit/events?once=1");
    const otherText = await other.text();
    expect(otherText).toContain("event: deck:updated");
    expect(otherText).toContain('"slug":"other"');
  });

  it("publishes a preview update after saving raw markdown", async () => {
    const previewEvents = createPreviewEventHub();
    const app = new Hono();
    app.route(
      "/decks",
      honoSlidesRouter({
        source: manifestDeckSource({ decks: [deck] }),
        dev: true,
        localDeckIO: createMemoryDeckIO({ deck1: "# Before" }),
        previewEvents,
      }),
    );

    const save = await app.request("/decks/deck1/edit/save", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ markdown: "# After" }),
    });
    const events = await app.request("/decks/deck1/edit/events?once=1");
    const text = await events.text();

    expect(save.status).toBe(200);
    expect(text).toContain("event: deck:updated");
    expect(text).toContain('"source":"save"');
  });

  it("keeps one-shot development events for queued event drains", async () => {
    const previewEvents = createPreviewEventHub();
    const app = new Hono();
    app.route(
      "/decks",
      honoSlidesRouter({
        source: manifestDeckSource({ decks: [deck] }),
        dev: true,
        localDeckIO: createMemoryDeckIO({ deck1: "# Raw Deck" }),
        previewEvents,
      }),
    );

    const response = await app.request("/decks/deck1/edit/events?once=1");
    expect(await response.text()).toContain("event: ready");

    previewEvents.publish({ type: "deck:updated", slug: "deck1", data: { source: "watch" } });

    const replay = await app.request("/decks/deck1/edit/events?once=1");
    expect(await replay.text()).toContain("event: deck:updated");

    const drained = await app.request("/decks/deck1/edit/events?once=1");
    expect(await drained.text()).not.toContain("event: deck:updated");
  });

  it("publishes a save preview update after LocalDeckIO write completes", async () => {
    const order: string[] = [];
    const app = new Hono();
    app.route(
      "/decks",
      honoSlidesRouter({
        source: manifestDeckSource({ decks: [deck] }),
        dev: true,
        localDeckIO: {
          async listFiles() {
            return [{ slug: "deck1", sourcePath: "decks/deck1/deck.mdx", kind: "directory" }];
          },
          async readMarkdown() {
            return "# Before";
          },
          async writeMarkdown() {
            order.push("write");
          },
        },
        previewEvents: {
          publish() {
            order.push("publish");
          },
          drain() {
            return [];
          },
        },
      }),
    );

    const response = await app.request("/decks/deck1/edit/save", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ markdown: "# After" }),
    });

    expect(response.status).toBe(200);
    expect(order).toEqual(["write", "publish"]);
  });

  it("awaits the dev file-change hook after saving instead of publishing a duplicate save event", async () => {
    const previewEvents = createPreviewEventHub();
    const fileChanges: unknown[] = [];
    const app = new Hono();
    app.route(
      "/decks",
      honoSlidesRouter({
        source: manifestDeckSource({ decks: [deck] }),
        dev: true,
        localDeckIO: createMemoryDeckIO({ deck1: "# Before" }),
        previewEvents,
        async onFileChange(event) {
          fileChanges.push(event);
          previewEvents.publish({ type: "deck:updated", slug: event.slug ?? "", data: { source: "watch", path: event.path } });
        },
      }),
    );

    const response = await app.request("/decks/deck1/edit/save", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ markdown: "# After" }),
    });
    const events = await app.request("/decks/deck1/edit/events?once=1");
    const text = await events.text();

    expect(response.status).toBe(200);
    expect(fileChanges).toEqual([{ type: "changed", path: "decks/deck1/deck.mdx", slug: "deck1" }]);
    expect(text).toContain('"source":"watch"');
    expect(text).not.toContain('"source":"save"');
  });

  it("passes deck context to the development agent chat callback", async () => {
    const calls: unknown[] = [];
    const app = new Hono();
    app.route(
      "/decks",
      honoSlidesRouter({
        source: manifestDeckSource({ decks: [deck] }),
        dev: true,
        localDeckIO: createMemoryDeckIO({ deck1: "# Raw Deck" }),
        agentChat: async (input) => {
          calls.push(input);
          return { source: "test", suggestion: "Tighten the title." };
        },
      }),
    );

    const response = await app.request("/decks/deck1/edit/agent/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: "session-1",
        instruction: "Improve this",
        activeSlide: 0,
        mode: "code",
        useWorkersAI: true,
      }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ source: "test", suggestion: "Tighten the title." });
    expect(calls).toEqual([
      {
        slug: "deck1",
        sessionId: "session-1",
        agentInstanceName: "deck-5-deck1-session-9-session-1",
        mode: "code",
        baseMarkdownHash: "mdx-b5765d09",
        sourcePath: "decks/deck1/deck.mdx",
        markdown: "# Raw Deck",
        instruction: "Improve this",
        activeSlide: 0,
        slideCount: 1,
        useWorkersAI: true,
      },
    ]);
  });

  it("passes the current editor markdown to agent chat when provided", async () => {
    const calls: unknown[] = [];
    const app = new Hono();
    app.route(
      "/decks",
      honoSlidesRouter({
        source: manifestDeckSource({ decks: [deck] }),
        dev: true,
        localDeckIO: createMemoryDeckIO({ deck1: "# Saved Deck" }),
        agentChat: async (input) => {
          calls.push(input);
          return { source: "test", suggestion: "Tighten the title." };
        },
      }),
    );

    const response = await app.request("/decks/deck1/edit/agent/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        instruction: "Improve this",
        markdown: "# Unsaved Deck",
      }),
    });

    expect(response.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      markdown: "# Unsaved Deck",
      baseMarkdownHash: createDeckMarkdownHash("# Unsaved Deck"),
    });
  });

  it("routes edit-intent chat messages as code mode even when the client is still in chat mode", async () => {
    const calls: unknown[] = [];
    const app = new Hono();
    app.route(
      "/decks",
      honoSlidesRouter({
        source: manifestDeckSource({ decks: [deck] }),
        dev: true,
        localDeckIO: createMemoryDeckIO({ deck1: "# Raw Deck" }),
        agentChat: async (input) => {
          calls.push(input);
          return { source: "test", suggestion: "Tighten the title." };
        },
      }),
    );

    const response = await app.request("/decks/deck1/edit/agent/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        instruction: "編集案を提示してください",
        mode: "chat",
      }),
    });

    expect(response.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      mode: "code",
      instruction: "編集案を提示してください",
    });
  });

  it("normalizes invalid activeSlide values before agent chat", async () => {
    const calls: unknown[] = [];
    const app = new Hono();
    app.route(
      "/decks",
      honoSlidesRouter({
        source: manifestDeckSource({ decks: [deck] }),
        dev: true,
        localDeckIO: createMemoryDeckIO({ deck1: "# Raw Deck" }),
        agentChat: async (input) => {
          calls.push(input);
          return { source: "test", suggestion: "Tighten the title." };
        },
      }),
    );

    for (const activeSlide of [-1, 1.5, Number.NaN]) {
      await app.request("/decks/deck1/edit/agent/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          instruction: "Improve this",
          activeSlide,
        }),
      });
    }

    expect(calls).toHaveLength(3);
    expect(calls.map((call) => (call as { activeSlide?: number }).activeSlide)).toEqual([undefined, undefined, undefined]);
  });

  it("drops activeSlide values outside the compiled deck slide range", async () => {
    const calls: unknown[] = [];
    const app = new Hono();
    app.route(
      "/decks",
      honoSlidesRouter({
        source: manifestDeckSource({ decks: [deck] }),
        dev: true,
        localDeckIO: createMemoryDeckIO({ deck1: "# Raw Deck" }),
        agentChat: async (input) => {
          calls.push(input);
          return { source: "test", suggestion: "Tighten the title." };
        },
      }),
    );

    await app.request("/decks/deck1/edit/agent/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        instruction: "Improve this",
        activeSlide: 1,
      }),
    });

    expect(calls).toHaveLength(1);
    expect((calls[0] as { activeSlide?: number }).activeSlide).toBeUndefined();
  });

  it("applies a replacement proposal through LocalDeckIO when dev is true", async () => {
    const writes: Array<{ slug: string; markdown: string }> = [];
    const previewEvents = createPreviewEventHub();
    const app = new Hono();
    app.route(
      "/decks",
      honoSlidesRouter({
        source: manifestDeckSource({ decks: [deck] }),
        dev: true,
        localDeckIO: createMemoryDeckIO({ deck1: "# Raw Deck" }, writes),
        previewEvents,
      }),
    );

    const response = await app.request("/decks/deck1/edit/apply", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        proposal: {
          type: "replacement",
          baseMarkdownHash: "mdx-b5765d09",
          markdown: "# Applied Deck",
        },
      }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      slug: "deck1",
      baseMarkdownHash: "mdx-b5765d09",
      markdown: "# Applied Deck",
    });
    expect(writes).toEqual([{ slug: "deck1", markdown: "# Applied Deck" }]);
    expect(previewEvents.drain("deck1")).toEqual([
      { type: "deck:updated", slug: "deck1", data: { source: "apply" } },
    ]);
  });

  it("awaits the dev file-change hook after applying a proposal", async () => {
    const writes: Array<{ slug: string; markdown: string }> = [];
    const previewEvents = createPreviewEventHub();
    const fileChanges: unknown[] = [];
    const app = new Hono();
    app.route(
      "/decks",
      honoSlidesRouter({
        source: manifestDeckSource({ decks: [deck] }),
        dev: true,
        localDeckIO: createMemoryDeckIO({ deck1: "# Raw Deck" }, writes),
        previewEvents,
        async onFileChange(event) {
          fileChanges.push(event);
          previewEvents.publish({ type: "deck:updated", slug: event.slug ?? "", data: { source: "watch", path: event.path } });
        },
      }),
    );

    const response = await app.request("/decks/deck1/edit/apply", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        proposal: {
          type: "replacement",
          baseMarkdownHash: "mdx-b5765d09",
          markdown: "# Applied Deck",
        },
      }),
    });

    expect(response.status).toBe(200);
    expect(writes).toEqual([{ slug: "deck1", markdown: "# Applied Deck" }]);
    expect(fileChanges).toEqual([{ type: "changed", path: "decks/deck1/deck.mdx", slug: "deck1" }]);
    expect(previewEvents.drain("deck1")).toEqual([
      { type: "deck:updated", slug: "deck1", data: { source: "watch", path: "decks/deck1/deck.mdx" } },
    ]);
  });

  it("applies a patch proposal through LocalDeckIO when dev is true", async () => {
    const writes: Array<{ slug: string; markdown: string }> = [];
    const app = new Hono();
    app.route(
      "/decks",
      honoSlidesRouter({
        source: manifestDeckSource({ decks: [deck] }),
        dev: true,
        localDeckIO: createMemoryDeckIO({ deck1: "# Raw Deck\n\nBody" }, writes),
      }),
    );

    const response = await app.request("/decks/deck1/edit/apply", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        proposal: {
          type: "patch",
          baseMarkdownHash: "mdx-6e129419",
          patches: [{ path: "decks/deck1/deck.mdx", oldText: "Body", newText: "Better body" }],
        },
      }),
    });

    expect(response.status).toBe(200);
    expect(writes).toEqual([{ slug: "deck1", markdown: "# Raw Deck\n\nBetter body" }]);
    await expect(response.json()).resolves.toMatchObject({
      markdown: "# Raw Deck\n\nBetter body",
    });
  });

  it("applies proposals against the current editor markdown when provided", async () => {
    const writes: Array<{ slug: string; markdown: string }> = [];
    const currentMarkdown = "# Unsaved Deck\n\nBody";
    const app = new Hono();
    app.route(
      "/decks",
      honoSlidesRouter({
        source: manifestDeckSource({ decks: [deck] }),
        dev: true,
        localDeckIO: createMemoryDeckIO({ deck1: "# Saved Deck" }, writes),
      }),
    );

    const response = await app.request("/decks/deck1/edit/apply", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        markdown: currentMarkdown,
        proposal: {
          type: "patch",
          baseMarkdownHash: createDeckMarkdownHash(currentMarkdown),
          patches: [{ path: "decks/deck1/deck.mdx", oldText: "Body", newText: "Better body" }],
        },
      }),
    });

    expect(response.status).toBe(200);
    expect(writes).toEqual([{ slug: "deck1", markdown: "# Unsaved Deck\n\nBetter body" }]);
    await expect(response.json()).resolves.toMatchObject({
      markdown: "# Unsaved Deck\n\nBetter body",
    });
  });

  it("rejects stale proposal hashes without writing", async () => {
    const writes: Array<{ slug: string; markdown: string }> = [];
    const app = new Hono();
    app.route(
      "/decks",
      honoSlidesRouter({
        source: manifestDeckSource({ decks: [deck] }),
        dev: true,
        localDeckIO: createMemoryDeckIO({ deck1: "# Raw Deck" }, writes),
      }),
    );

    const response = await app.request("/decks/deck1/edit/apply", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        proposal: {
          type: "replacement",
          baseMarkdownHash: "mdx-stale",
          markdown: "# Applied Deck",
        },
      }),
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "Proposal targets mdx-stale but current deck is mdx-b5765d09.",
    });
    expect(writes).toEqual([]);
  });

  it("rejects ambiguous patch proposals without writing", async () => {
    const writes: Array<{ slug: string; markdown: string }> = [];
    const app = new Hono();
    app.route(
      "/decks",
      honoSlidesRouter({
        source: manifestDeckSource({ decks: [deck] }),
        dev: true,
        localDeckIO: createMemoryDeckIO({ deck1: "Same\nSame" }, writes),
      }),
    );

    const response = await app.request("/decks/deck1/edit/apply", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        proposal: {
          type: "patch",
          baseMarkdownHash: "mdx-51fcc1d",
          patches: [{ path: "decks/deck1/deck.mdx", oldText: "Same", newText: "Different" }],
        },
      }),
    });

    expect(response.status).toBe(422);
    expect(writes).toEqual([]);
  });

  it("rejects patch proposals for a different source path", async () => {
    const writes: Array<{ slug: string; markdown: string }> = [];
    const app = new Hono();
    app.route(
      "/decks",
      honoSlidesRouter({
        source: manifestDeckSource({ decks: [deck] }),
        dev: true,
        localDeckIO: createMemoryDeckIO({ deck1: "# Raw Deck" }, writes),
      }),
    );

    const response = await app.request("/decks/deck1/edit/apply", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        proposal: {
          type: "patch",
          baseMarkdownHash: "mdx-b5765d09",
          patches: [{ path: "decks/other.mdx", oldText: "# Raw Deck", newText: "# Other" }],
        },
      }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Patch path must match current deck source: decks/deck1/deck.mdx" });
    expect(writes).toEqual([]);
  });

  it("rejects patch proposals for another path when compiled sourcePath is unavailable", async () => {
    const writes: Array<{ slug: string; markdown: string }> = [];
    const app = new Hono();
    app.route(
      "/decks",
      honoSlidesRouter({
        source: manifestDeckSource({ decks: [] }),
        dev: true,
        localDeckIO: createMemoryDeckIO({ deck1: "# Raw Deck" }, writes),
      }),
    );

    const response = await app.request("/decks/deck1/edit/apply", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        proposal: {
          type: "patch",
          baseMarkdownHash: "mdx-b5765d09",
          patches: [{ path: "decks/other.mdx", oldText: "# Raw Deck", newText: "# Other" }],
        },
      }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Patch path must match current deck source: decks/deck1.mdx" });
    expect(writes).toEqual([]);
  });

  it("does not expose apply route when dev is false", async () => {
    const app = new Hono();
    app.route("/decks", honoSlidesRouter({ source: manifestDeckSource({ decks: [deck] }), dev: false }));

    const response = await app.request("/decks/deck1/edit/apply", { method: "POST" });

    expect(response.status).toBe(404);
  });

  it("exports the production router from the public module", async () => {
    const mod = await import("../src/mod");
    expect(typeof mod.honoSlidesRouter).toBe("function");
    expect(typeof mod.manifestDeckSource).toBe("function");
    expect(typeof mod.createPreviewEventHub).toBe("function");
    expect(typeof mod.resolveDeckFiles).toBe("function");
    expect(typeof mod.createDeckAgentInstanceName).toBe("function");
    expect(typeof mod.parseDeckAgentMode).toBe("function");
    expect(typeof mod.createDeckAgentToolProvider).toBe("function");
    expect(typeof mod.applyDeckAgentProposal).toBe("function");
    expect(typeof mod.createCloudflareDeckAgentChat).toBe("function");
    expect(typeof mod.createDeckCodeModeTool).toBe("function");
  });
});

function createMemoryDeckIO(
  markdownBySlug: Record<string, string>,
  writes: Array<{ slug: string; markdown: string }> = [],
): LocalDeckIO {
  return {
    async listFiles() {
      return Object.keys(markdownBySlug).map((slug) => ({
        slug,
        sourcePath: `decks/${slug}.mdx`,
        kind: "single-file",
      }));
    },
    async readMarkdown(slug) {
      return markdownBySlug[slug] ?? null;
    },
    async writeMarkdown(slug, markdown) {
      if (!(slug in markdownBySlug)) throw new Error(`Unknown deck slug: "${slug}"`);
      writes.push({ slug, markdown });
      markdownBySlug[slug] = markdown;
    },
  };
}
