import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import type { CompiledDeck, LocalDeckIO } from "../src/deck";
import { manifestDeckSource } from "../src/manifest-source";
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
      }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ source: "test", suggestion: "Tighten the title." });
    expect(calls).toEqual([
      {
        slug: "deck1",
        sessionId: "session-1",
        markdown: "# Raw Deck",
        instruction: "Improve this",
        activeSlide: 0,
      },
    ]);
  });

  it("exports the production router from the public module", async () => {
    const mod = await import("../src/mod");
    expect(typeof mod.honoSlidesRouter).toBe("function");
    expect(typeof mod.manifestDeckSource).toBe("function");
    expect(typeof mod.resolveDeckFiles).toBe("function");
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
