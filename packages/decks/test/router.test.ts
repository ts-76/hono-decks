import { Hono } from "hono";
import { jsx } from "hono/jsx/jsx-runtime";
import { describe, expect, it } from "vitest";
import type { CompiledDeck } from "../src/deck/model";
import { defineDecks } from "../src/server/define-decks";
import { manifestDeckSource } from "../src/source/manifest-source";
import { withR2Assets } from "../src/source/r2-assets";
import { deckContext, decksRouter } from "../src/server/router";
import type { DeckContextVariables } from "../src/server/router";

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

describe("decksRouter", () => {
  it("serves an index and an iframe viewer wrapper under the mount path", async () => {
    const app = new Hono();
    app.route("/slides", decksRouter({ source: manifestDeckSource({ decks: [deck] }) }));

    const index = await app.request("/slides");
    expect(index.status).toBe(200);
    expect(await index.text()).toContain("/slides/deck1");

    const response = await app.request("/slides/deck1");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    const html = await response.text();
    expect(html).toContain('data-hono-decks-viewer');
    expect(html).toContain('<h1 id="hono-decks-viewer-title" class="hono-decks-viewer-title">Deck One</h1>');
    expect(html).toContain('class="hono-decks-viewer-meta"');
    expect(html).toContain('src="/slides/deck1/render"');
    expect(html).toContain('title="Deck One"');
    expect(html).toContain(".hono-decks-viewport{width:min(100vw,calc(100vh * 16 / 9));aspect-ratio:16/9");
    expect(html).toContain(".hono-decks-viewport:focus-visible");
    expect(html).toContain(".hono-decks-frame-stage{width:100%;height:100%");
    expect(html).toContain(".hono-decks-frame-stage iframe{width:100%;height:100%");
    expect(html).toContain("@media (prefers-reduced-motion: reduce)");
    expect(html).not.toContain('width="1920"');
    expect(html).not.toContain('height="1080"');
    expect(html).not.toContain("DESIGN_WIDTH");
    expect(html).not.toContain("stage.style.transform");
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('data-action="previous"');
    expect(html).toContain('data-action="next"');
    expect(html).toContain('data-action="fullscreen"');
    expect(html).toContain("message.stepCount");
    expect(html).toContain('String(message.stepIndex) + " / " + String(message.stepCount)');
    expect(html).toContain("pointerdown");
    expect(html).toContain("pointerup");
    expect(html).toContain("touch-action:pan-y");
    expect(html).not.toContain("/edit");
    expect(html).not.toContain("/agent/chat");
    expect(html).not.toContain("/apply");
  });

  it("lets callers hide default viewer controls and add viewer-only styles", async () => {
    const app = new Hono();
    app.route(
      "/slides",
      decksRouter({
        source: manifestDeckSource({ decks: [deck] }),
        style: ".slide-only { color: red; }",
        viewer: {
          controls: false,
          style: "[data-custom-viewer-shell] { color: cyan; }",
          head: jsx("meta", { name: "custom-viewer", content: "yes" }),
        },
      }),
    );

    const viewerHtml = await (await app.request("/slides/deck1")).text();
    const renderHtml = await (await app.request("/slides/deck1/render")).text();

    expect(viewerHtml).toContain('src="/slides/deck1/render"');
    expect(viewerHtml).toContain("[data-custom-viewer-shell] { color: cyan; }");
    expect(viewerHtml).toContain('<meta name="custom-viewer" content="yes"/>');
    expect(viewerHtml).not.toContain('data-action="previous"');
    expect(viewerHtml).not.toContain('data-action="next"');
    expect(viewerHtml).not.toContain('data-action="fullscreen"');
    expect(viewerHtml).not.toContain(".slide-only { color: red; }");
    expect(renderHtml).toContain(".slide-only { color: red; }");
    expect(renderHtml).not.toContain("[data-custom-viewer-shell] { color: cyan; }");
    expect(renderHtml).not.toContain("custom-viewer");
  });

  it("lets callers render a custom viewer layout with frame, controls, and toc parts", async () => {
    const app = new Hono();
    app.route(
      "/slides",
      decksRouter({
        source: manifestDeckSource({ decks: [deck] }),
        viewer: {
          render: ({ frame, controls, toc, slides, meta }) =>
            jsx("section", {
              "data-custom-viewer": meta.title,
              "data-slide-count": String(slides.length),
              children: [
                jsx("header", { children: meta.title }),
                toc,
                frame,
                controls,
              ],
            }),
        },
      }),
    );

    const html = await (await app.request("/slides/deck1")).text();

    expect(html).toContain('data-custom-viewer="Deck One"');
    expect(html).toContain('data-slide-count="1"');
    expect(html).toContain('data-hono-decks-frame');
    expect(html).toContain('data-hono-decks-toc');
    expect(html).toContain('data-action="goTo"');
    expect(html).toContain('action: "goTo"');
  });

  it("creates a router from a generated manifest with defineDecks", async () => {
    const decks = defineDecks({ manifest: { decks: [deck] } });
    const app = new Hono();

    app.route("/decks", decks.router());

    const response = await app.request("/decks/deck1/render");
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("<h1>Intro</h1>");
  });

  it("serves the compiled deck on a fixed 1920x1080 render route", async () => {
    const app = new Hono();
    app.route("/slides", decksRouter({ source: manifestDeckSource({ decks: [deck] }) }));

    const response = await app.request("/slides/deck1/render");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    const html = await response.text();
    expect(html).toContain("<h1>Intro</h1>");
    expect(html).toContain("--hono-decks-width:1920px");
    expect(html).toContain("--hono-decks-height:1080px");
    expect(html).toContain('window.addEventListener("message"');
    expect(html).not.toContain('data-hono-decks-controls');
  });

  it("returns a clear 500 response when a compiled slide render fails", async () => {
    const failingDeck = {
      ...deck,
      slides: [
        {
          ...deck.slides[0],
          render: () => {
            throw new Error("badge exploded");
          },
        },
      ],
    } satisfies CompiledDeck;
    const app = new Hono();
    app.route("/slides", decksRouter({ source: manifestDeckSource({ decks: [failingDeck] }) }));

    const response = await app.request("/slides/deck1/render");

    expect(response.status).toBe(500);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(await response.text()).toContain("Render failed in decks/deck1/deck.mdx slide 1: badge exploded");
  });

  it("passes Hono JSX slide components and client entrypoint to render routes", async () => {
    const componentDeck = {
      ...deck,
      slides: [
        {
          ...deck.slides[0],
          nodes: [
            {
              type: "component",
              name: "Badge",
              props: { label: "Worker-safe" },
              children: [],
            },
          ],
        },
      ],
    } satisfies CompiledDeck;
    const app = new Hono();
    app.route(
      "/slides",
      decksRouter({
        source: manifestDeckSource({ decks: [componentDeck] }),
        clientEntry: "/assets/slides.client.js",
        components: {
          Badge: (props) => jsx("strong", { class: "badge", children: String(props.label) }),
        },
      }),
    );

    const html = await (await app.request("/slides/deck1/render")).text();

    expect(html).toContain('class="badge"');
    expect(html).toContain("Worker-safe");
    expect(html).toContain('<script type="module" src="/assets/slides.client.js"></script>');
  });

  it("passes trusted theme layouts, components, and styles to render routes", async () => {
    const themeDeck = {
      ...deck,
      slides: [
        {
          ...deck.slides[0],
          nodes: [
            {
              type: "component",
              name: "ThemeBadge",
              props: { tone: "accent" },
              children: [{ type: "text", value: "Theme route" }],
            },
          ],
        },
      ],
    } satisfies CompiledDeck;
    const app = new Hono();
    app.route(
      "/slides",
      decksRouter({
        source: manifestDeckSource({ decks: [themeDeck] }),
        theme: {
          style: ".theme-cover{display:grid}",
          components: {
            ThemeBadge: (props) => jsx("strong", { class: `theme-badge-${String(props.tone)}`, children: props.children }),
          },
          layouts: {
            cover: ({ children }) => jsx("div", { class: "theme-cover", children }),
          },
        },
      }),
    );

    const html = await (await app.request("/slides/deck1/render")).text();

    expect(html).toContain(".theme-cover{display:grid}");
    expect(html).toContain('class="theme-cover"');
    expect(html).toContain('class="theme-badge-accent"');
    expect(html).toContain("Theme route");
    expect(html).not.toContain("mdx-component");
  });

  it("serves an embedded client entry asset from the mounted router", async () => {
    const app = new Hono();
    app.route(
      "/slides",
      decksRouter({
        source: manifestDeckSource({ decks: [deck] }),
        clientEntryAsset: "console.log('deck client');",
      }),
    );

    const renderHtml = await (await app.request("/slides/deck1/render")).text();
    const asset = await app.request("/slides/_assets/client.js");

    expect(renderHtml).toContain('<script type="module" src="/slides/_assets/client.js"></script>');
    expect(asset.status).toBe(200);
    expect(asset.headers.get("content-type")).toContain("text/javascript");
    expect(asset.headers.get("cache-control")).toBe("public, max-age=300");
    expect(await asset.text()).toBe("console.log('deck client');");
  });

  it("can serve generated local asset paths from an R2 bucket with cache headers", async () => {
    const app = new Hono();
    const source = withR2Assets(manifestDeckSource({ decks: [deck] }), {
      bucket: {
        async get(key: string) {
          if (key !== "decks/deck1/assets/image.png") return null;
          return {
            body: new Uint8Array([4, 5, 6]),
            writeHttpMetadata(headers: Headers) {
              headers.set("content-type", "image/png");
            },
          };
        },
      },
      cacheControl: "public, max-age=31536000, immutable",
    });
    app.route("/slides", decksRouter({ source }));

    const response = await app.request("/slides/deck1/assets/image.png");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/png");
    expect(response.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(Array.from(new Uint8Array(await response.arrayBuffer()))).toEqual([4, 5, 6]);
  });

  it("lets an explicit clientEntry URL override the generated asset URL", async () => {
    const app = new Hono();
    app.route(
      "/slides",
      decksRouter({
        source: manifestDeckSource({ decks: [deck] }),
        clientEntry: "/assets/slides.client.js",
        clientEntryAsset: "console.log('deck client');",
      }),
    );

    const renderHtml = await (await app.request("/slides/deck1/render")).text();

    expect(renderHtml).toContain('<script type="module" src="/assets/slides.client.js"></script>');
    expect(renderHtml).not.toContain("/slides/_assets/client.js");
  });

  it("lets callers mount future feature routers without coupling viewer routes to edit code", async () => {
    const app = new Hono();
    const extension = new Hono();
    extension.get("/:slug/edit", (c) => c.text(`edit:${c.req.param("slug")}`));
    app.route(
      "/slides",
      decksRouter({
        source: manifestDeckSource({ decks: [deck] }),
        extensions: [{ path: "/", router: extension }],
      }),
    );

    const edit = await app.request("/slides/deck1/edit");
    const view = await app.request("/slides/deck1");

    expect(edit.status).toBe(200);
    expect(await edit.text()).toBe("edit:deck1");
    expect(view.status).toBe(200);
    expect(await view.text()).toContain('src="/slides/deck1/render"');
  });

  it("does not expose edit routes by default, even in dev mode", async () => {
    const app = new Hono();
    app.route("/slides", decksRouter({ source: manifestDeckSource({ decks: [deck] }), dev: true }));

    expect((await app.request("/slides/deck1/edit")).status).toBe(404);
    expect((await app.request("/slides/deck1/edit/events")).status).toBe(404);
    expect((await app.request("/slides/deck1/edit/save", { method: "POST" })).status).toBe(404);
    expect((await app.request("/slides/deck1/edit/agent/chat", { method: "POST" })).status).toBe(404);
    expect((await app.request("/slides/deck1/edit/apply", { method: "POST" })).status).toBe(404);
  });

  it("adds live reload to render pages only when an extension provides a path", async () => {
    const app = new Hono();
    app.route(
      "/decks",
      decksRouter({
        source: manifestDeckSource({ decks: [deck] }),
        dev: true,
        liveReloadPath: (slug, mountPath) => `${mountPath}/${encodeURIComponent(slug)}/events`,
      }),
    );

    const wrapperHtml = await (await app.request("/decks/deck1")).text();
    const renderHtml = await (await app.request("/decks/deck1/render")).text();

    expect(wrapperHtml).not.toContain("new EventSource");
    expect(renderHtml).toContain("new EventSource");
    expect(renderHtml).toContain('const eventsUrl = "/decks/deck1/events"');
  });

  it("serves local deck assets and returns 404 for missing slugs", async () => {
    const app = new Hono();
    app.route("/decks", decksRouter({ source: manifestDeckSource({ decks: [deck] }) }));

    const asset = await app.request("/decks/deck1/assets/image.png");
    expect(asset.status).toBe(200);
    expect(asset.headers.get("content-type")).toBe("image/png");

    const missing = await app.request("/decks/missing");
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: "Deck not found", slug: "missing" });
  });

  it("provides deck-aware context variables for custom routes", async () => {
    const app = new Hono<{ Variables: DeckContextVariables }>();
    app.get("/slides/:slug/embed", deckContext({ source: manifestDeckSource({ decks: [deck] }) }), (c) => {
      return c.html(`<article data-context-deck="${c.var.deck.slug}" data-render-url="${c.var.deckViewer.renderUrl}" data-toc-count="${c.var.deckToc.length}">${c.var.deckViewer.frameHtml}<p>${c.var.deckMeta.title}</p></article>`);
    });

    const response = await app.request("/slides/deck1/embed");
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('data-context-deck="deck1"');
    expect(html).toContain('data-render-url="/slides/deck1/render"');
    expect(html).toContain('data-toc-count="1"');
    expect(html).toContain('data-hono-decks-frame');
    expect(html).toContain("Deck One");
  });

  it("lets deckContext target a public mount path from custom admin routes", async () => {
    const app = new Hono<{ Variables: DeckContextVariables }>();
    app.get(
      "/admin/decks/:slug",
      deckContext({ source: manifestDeckSource({ decks: [deck] }), mountPath: "/decks" }),
      (c) => c.json({ renderUrl: c.var.deckViewer.renderUrl, canonicalPath: c.var.deckMeta.canonicalPath }),
    );

    const response = await app.request("/admin/decks/deck1");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      renderUrl: "/decks/deck1/render",
      canonicalPath: "/decks/deck1",
    });
  });

  it("applies draft filtering in deckContext routes", async () => {
    const draftDeck = {
      ...deck,
      slug: "draft",
      meta: { ...deck.meta, title: "Draft Deck", draft: true },
    } satisfies CompiledDeck;
    const source = manifestDeckSource({ decks: [draftDeck] });
    const app = new Hono<{ Variables: DeckContextVariables }>();
    app.get("/slides/:slug/embed", deckContext({ source }), (c) => c.text(c.var.deck.slug));
    app.get("/dev/:slug/embed", deckContext({ source, dev: true, mountPath: "/dev" }), (c) => c.text(c.var.deck.slug));

    const production = await app.request("/slides/draft/embed");
    const dev = await app.request("/dev/draft/embed");

    expect(production.status).toBe(404);
    expect(await production.json()).toEqual({ error: "Deck not found", slug: "draft" });
    expect(dev.status).toBe(200);
    expect(await dev.text()).toBe("draft");
  });

  it("hides draft decks from production index and direct viewing routes", async () => {
    const draftDeck = {
      ...deck,
      slug: "draft",
      meta: { ...deck.meta, title: "Draft Deck", draft: true },
    } satisfies CompiledDeck;
    const app = new Hono();
    app.route("/slides", decksRouter({ source: manifestDeckSource({ decks: [deck, draftDeck] }) }));

    const index = await app.request("/slides");
    expect(await index.text()).not.toContain("/slides/draft");

    const response = await app.request("/slides/draft");
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Deck not found", slug: "draft" });
  });

  it("shows draft decks in development mode", async () => {
    const draftDeck = {
      ...deck,
      slug: "draft",
      meta: { ...deck.meta, title: "Draft Deck", draft: true },
    } satisfies CompiledDeck;
    const app = new Hono();
    app.route("/slides", decksRouter({ source: manifestDeckSource({ decks: [draftDeck] }), dev: true }));

    const index = await app.request("/slides");
    expect(await index.text()).toContain("/slides/draft");

    const response = await app.request("/slides/draft");
    expect(response.status).toBe(200);
  });

  it("exports the viewer router from the public module", async () => {
    const mod = await import("../src/mod");

    expect(typeof mod.decksRouter).toBe("function");
    expect(typeof mod.deckContext).toBe("function");
    expect(typeof mod.createDeckViewerParts).toBe("function");
  });
});
