import { Hono } from "hono";
import { describe, expect, it } from "vitest";
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
  it("serves an index and a compiled deck under the mount path", async () => {
    const app = new Hono();
    app.route("/slides", honoSlidesRouter({ source: manifestDeckSource({ decks: [deck] }), dev: false }));

    const index = await app.request("/slides");
    expect(index.status).toBe(200);
    expect(await index.text()).toContain("/slides/deck1");

    const response = await app.request("/slides/deck1");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(await response.text()).toContain("<h1>Intro</h1>");
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
    expect((await app.request("/decks/deck1/events")).status).toBe(404);
    expect((await app.request("/decks/deck1/save", { method: "POST" })).status).toBe(404);
    expect((await app.request("/decks/deck1/agent/chat", { method: "POST" })).status).toBe(404);
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
    expect(await response.text()).toContain("# Raw Deck");
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

    const response = await app.request("/decks/deck1/save", {
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

    const response = await app.request("/decks/deck1/events");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(await response.text()).toContain("event: ready");
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

    const response = await app.request("/decks/deck1/events");
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

    await app.request("/decks/deck1/events");

    const deck1Again = await app.request("/decks/deck1/events");
    expect(await deck1Again.text()).not.toContain("event: deck:updated");

    const other = await app.request("/decks/other/events");
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

    const save = await app.request("/decks/deck1/save", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ markdown: "# After" }),
    });
    const events = await app.request("/decks/deck1/events");
    const text = await events.text();

    expect(save.status).toBe(200);
    expect(text).toContain("event: deck:updated");
    expect(text).toContain('"source":"save"');
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

    const response = await app.request("/decks/deck1/save", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ markdown: "# After" }),
    });

    expect(response.status).toBe(200);
    expect(order).toEqual(["write", "publish"]);
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

    const response = await app.request("/decks/deck1/agent/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: "session-1",
        instruction: "Improve this",
        activeSlide: 0,
        mode: "code",
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
      },
    ]);
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

    const response = await app.request("/decks/deck1/apply", {
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
    expect(await response.json()).toEqual({ ok: true, slug: "deck1", baseMarkdownHash: "mdx-b5765d09" });
    expect(writes).toEqual([{ slug: "deck1", markdown: "# Applied Deck" }]);
    expect(previewEvents.drain("deck1")).toEqual([
      { type: "deck:updated", slug: "deck1", data: { source: "apply" } },
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

    const response = await app.request("/decks/deck1/apply", {
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

    const response = await app.request("/decks/deck1/apply", {
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

    const response = await app.request("/decks/deck1/apply", {
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

    const response = await app.request("/decks/deck1/apply", {
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

  it("does not expose apply route when dev is false", async () => {
    const app = new Hono();
    app.route("/decks", honoSlidesRouter({ source: manifestDeckSource({ decks: [deck] }), dev: false }));

    const response = await app.request("/decks/deck1/apply", { method: "POST" });

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
