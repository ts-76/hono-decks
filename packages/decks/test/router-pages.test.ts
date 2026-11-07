import { Hono } from "hono";
import { jsx } from "hono/jsx/jsx-runtime";
import { describe, expect, it } from "vite-plus/test";
import { manifestDeckSource } from "../src/source/manifest-source";
import { withR2Assets } from "../src/source/r2-assets";
import { decksRouter } from "../src/server/router";
import type { CompiledDeck } from "../src/deck/model";
import { deck } from "./support/router-fixtures";

describe("decksRouter page surfaces", () => {
  it("includes overflow diagnostics only on development presentation surfaces", async () => {
    for (const dev of [true, false]) {
      const app = new Hono();
      app.route("/slides", decksRouter({ source: manifestDeckSource({ decks: [deck] }), dev }));
      for (const surface of ["render", "presentation", "print"]) {
        const html = await (await app.request(`/slides/deck1/${surface}`)).text();
        expect(html.includes("data-hono-decks-overflow-checker")).toBe(dev && surface !== "print");
      }
    }
  });
  it("does not display external asset diagnostics in render, presentation, or print pages", async () => {
    const external = {
      ...deck,
      warnings: [
        { code: "external-asset-unverified", message: "Remote asset existence cannot be verified" },
        { code: "unknown-transition", message: "Unknown transition" },
      ],
    };
    const app = new Hono();
    app.route("/slides", decksRouter({ source: manifestDeckSource({ decks: [external] }) }));

    for (const surface of ["render", "presentation", "print"]) {
      const response = await app.request(`/slides/deck1/${surface}`);
      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).not.toContain("Remote asset existence cannot be verified");
      expect(html).toContain("Unknown transition");
    }
    expect(external.warnings).toHaveLength(2);
  });

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
    expect(html).toContain("data-hono-decks-viewer");
    expect(html).toContain('<h1 id="hono-decks-viewer-title" class="hono-decks-viewer-title">Deck One</h1>');
    expect(html).toContain('class="hono-decks-viewer-meta"');
    expect(html).toContain('src="/slides/deck1/render"');
    expect(html).toContain('title="Deck One"');
    expect(html).toContain(".hono-decks-viewport{width:min(100%,calc((100vh - 58px) * 16 / 9));aspect-ratio:16/9");
    expect(html).toContain(".hono-decks-viewport:focus-visible");
    expect(html).toContain(":where(*:focus-visible){outline:2px solid currentColor;outline-offset:2px}");
    expect(html).toContain(".hono-decks-frame-stage{width:100%;height:100%");
    expect(html).toContain(".hono-decks-frame-stage iframe{width:100%;height:100%");
    expect(html).not.toContain(
      ".hono-decks-frame-stage iframe{width:100%;height:100%;border:0;display:block;background:",
    );
    expect(html).toContain("@media (prefers-reduced-motion: reduce)");
    expect(html).not.toContain('width="1920"');
    expect(html).not.toContain('height="1080"');
    expect(html).not.toContain("DESIGN_WIDTH");
    expect(html).not.toContain("stage.style.transform");
    expect(html).toContain('tabindex="0"');
    expect(html).not.toContain("data-viewer-navigation");
    expect(html).not.toContain("hono-decks-viewer-navigation-layer");
    expect(html).toContain('data-hono-decks-mobile-navigation="previous"');
    expect(html).toContain('data-hono-decks-mobile-navigation="next"');
    expect(html).toContain("[data-hono-decks-mobile-action='previous']");
    expect(html).toContain("[data-hono-decks-mobile-action='next']");
    expect(html).toContain(":where(.hono-decks-mobile-navigation){position:absolute;top:25%;bottom:25%;display:none");
    expect(html).toContain("width:clamp(2.25rem,6%,2.75rem)");
    expect(html).toContain("background:transparent;color:transparent");
    expect(html).toContain("appearance:none;pointer-events:none");
    expect(html).toContain(".hono-decks-mobile-navigation){display:inline-flex;pointer-events:auto}");
    expect(html).toContain(
      ":where(.hono-decks-viewport>[data-hono-decks-position]){position:absolute;left:0;right:0;bottom:0",
    );
    expect(html).toContain("@media (orientation:landscape) and (max-height:600px)");
    expect(html).toContain("bottom:auto;flex-direction:column");
    expect(html).toContain("@media (pointer:coarse)");
    expect(html).toContain(
      ':where(.hono-decks-viewer-controls [data-hono-decks-navigation-control="fullscreen"]),:where(.hono-decks-viewer-controls [data-hono-decks-print]){display:none}',
    );
    expect(html).toContain(
      ':where(.hono-decks-viewer-controls [data-hono-decks-navigation-control="previous"]),:where(.hono-decks-viewer-controls [data-hono-decks-navigation-control="next"])',
    );
    expect(html).toContain('data-action="previous"');
    expect(html).toContain('data-action="next"');
    expect(html).toContain('data-action="fullscreen"');
    expect(html).toContain('href="/slides/deck1/print"');
    expect(html).toContain('data-hono-decks-print="true"');
    expect(html).toContain('aria-label="Print view"');
    expect(html).toContain("data-hono-decks-control-icon");
    expect(html).toContain("pointer-events:none");
    expect(html).toContain('aria-label="Previous slide"');
    expect(html).toContain('aria-label="Next slide"');
    expect(html).toContain('aria-label="Toggle fullscreen"');
    expect(html).toContain('href="/slides"');
    expect(html).toContain("data-hono-decks-back-link");
    expect(html).toContain("message.stepCount");
    expect(html).toContain("writeViewerPaginationState(message)");
    expect(html).toContain('params.set("slide", String(message.index + 1))');
    expect(html).toContain('content="width=device-width, initial-scale=1, viewport-fit=cover"');
    expect(html).toContain("@supports (height:100dvh)");
    expect(html).toContain("grid-template-rows:minmax(0,1fr)");
    expect(html).toContain("padding:env(safe-area-inset-top,0)");
    expect(html).toContain("container-type:size");
    expect(html).toContain(".hono-decks-viewer-stage{display:grid;place-items:center;justify-content:center");
    expect(html).toContain("@supports (width:1cqw)");
    expect(html).toContain("bottom:max(.25rem,env(safe-area-inset-bottom,0))");
    expect(html).toContain('root.setAttribute("data-step-index", String(message.stepIndex ?? 0))');
    expect(html).toContain('root.setAttribute("data-step-count", String(message.stepCount ?? 0))');
    expect(html).not.toContain('String(message.stepIndex) + " / " + String(message.stepCount)');
    expect(html).toContain("touch-action:pan-y");
    expect(html).not.toContain("suppressCurrentNavigationClick");
    expect(html).toContain("target?.__honoDecksPresentationRuntime?.command");
    expect(html).toContain("command(action, index)");
    expect(html).toContain("target?.postMessage");
    expect(html).toContain('orientation.lock("landscape")');
    expect(html).toContain("unlockViewerOrientation()");
    expect(html).toContain('document.addEventListener("fullscreenchange"');
    expect(html).toContain("root.querySelectorAll(\"[data-action='previous']\")");
    expect(html).toContain("root.querySelectorAll(\"[data-action='next']\")");
    expect(html).toContain("root.querySelectorAll(\"[data-action='fullscreen']\")");
    expect(html).toContain('data-hono-decks-print-path="/slides/deck1/print"');
    expect(html).toContain('(event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "p"');
    expect(html).toContain('printUrl.searchParams.set("autoprint", "1")');
    expect(html).toContain("window.location.assign(printUrl)");
    expect(html).not.toContain("/edit");
    expect(html).not.toContain("/agent/chat");
    expect(html).not.toContain("/apply");
  });

  it("applies request-aware document policy and strict CSP nonces to every router HTML surface", async () => {
    const app = new Hono();
    const nonce = "request-nonce";
    app.use("/slides/*", async (c, next) => {
      await next();
      c.header(
        "content-security-policy",
        `default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}'`,
      );
    });
    app.route(
      "/slides",
      decksRouter({
        source: manifestDeckSource({ decks: [deck] }),
        document: {
          lang: ({ surface }) => (surface === "index" ? "en" : "ja"),
          nonce: ({ c }) => c.req.header("x-document-nonce"),
          head: ({ surface }) => jsx("meta", { "data-document-surface": surface }),
          surfaces: {
            presenter: { lang: "en-GB" },
          },
        },
        viewer: { lang: "fr" },
      }),
    );

    const routes = [
      ["index", "/slides", "en"],
      ["viewer", "/slides/deck1", "fr"],
      ["render", "/slides/deck1/render", "ja"],
      ["print", "/slides/deck1/print", "ja"],
      ["presentation", "/slides/deck1/presentation", "ja"],
      ["presenter", "/slides/deck1/presenter", "en-GB"],
    ] as const;

    for (const [surface, path, lang] of routes) {
      const response = await app.request(path, { headers: { "x-document-nonce": nonce } });
      const html = await response.text();
      expect(response.status, surface).toBe(200);
      expect(response.headers.get("content-security-policy"), surface).toContain(`'nonce-${nonce}'`);
      expect(html, surface).toContain(`<html lang="${lang}"`);
      expect(html, surface).toContain(`data-document-surface="${surface}"`);

      for (const tag of html.match(/<(?:style|script)\b[^>]*>/gi) ?? []) {
        expect(tag, `${surface}: ${tag}`).toContain(`nonce="${nonce}"`);
      }
    }
  });

  it("customizes the index document with request-aware title and JSX rendering", async () => {
    const app = new Hono();
    app.route(
      "/slides",
      decksRouter({
        source: manifestDeckSource({ decks: [deck] }),
        pages: {
          index: {
            enabled: ({ c }) => c.req.header("x-index-enabled") === "1",
            title: ({ decks }) => `${decks.length} available deck`,
            render: ({ decks, defaultContent, title }) =>
              jsx("main", {
                "data-custom-index": true,
                children: [jsx("h1", { children: title }), jsx("p", { children: decks[0]?.slug }), defaultContent],
              }),
          },
        },
      }),
    );

    expect((await app.request("/slides")).status).toBe(404);
    const response = await app.request("/slides", { headers: { "x-index-enabled": "1" } });
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("<title>1 available deck</title>");
    expect(html).toContain('data-custom-index="true"');
    expect(html).toContain("<p>deck1</p>");
    expect(html).toContain('href="/slides/deck1"');
  });

  it("gates optional page surfaces with request-aware hooks", async () => {
    const app = new Hono();
    app.route(
      "/slides",
      decksRouter({
        source: manifestDeckSource({ decks: [deck] }),
        pages: {
          viewer: ({ c, deck: routeDeck, surface }) =>
            surface === "viewer" && routeDeck?.slug === "deck1" && c.req.header("x-viewer-enabled") === "1",
          render: ({ c }) => c.req.header("x-render-enabled") === "1",
          print: false,
          presentation: false,
          presenter: false,
        },
      }),
    );

    expect((await app.request("/slides/deck1")).status).toBe(404);
    const viewer = await app.request("/slides/deck1", { headers: { "x-viewer-enabled": "1" } });
    const viewerHtml = await viewer.text();
    expect(viewer.status).toBe(200);
    expect(viewerHtml).not.toContain('data-hono-decks-print="true"');
    expect(viewerHtml).not.toContain('data-hono-decks-print-path="/slides/deck1/print"');
    expect((await app.request("/slides/deck1/render")).status).toBe(404);
    expect((await app.request("/slides/deck1/render", { headers: { "x-render-enabled": "1" } })).status).toBe(200);
    expect((await app.request("/slides/deck1/print")).status).toBe(404);
    expect((await app.request("/slides/deck1/presentation")).status).toBe(404);
    expect((await app.request("/slides/deck1/presenter")).status).toBe(404);
  });

  it("keeps the print control aligned with a request-aware print resolver", async () => {
    const app = new Hono();
    app.route(
      "/slides",
      decksRouter({
        source: manifestDeckSource({ decks: [deck] }),
        pages: { print: ({ c }) => c.req.header("x-print-enabled") === "1" },
        embed: {},
      }),
    );

    const disabledViewer = await (await app.request("/slides/deck1")).text();
    const enabledViewer = await (await app.request("/slides/deck1", { headers: { "x-print-enabled": "1" } })).text();

    expect(disabledViewer).not.toContain('data-hono-decks-print="true"');
    expect(disabledViewer).not.toContain(' data-hono-decks-print-path="');
    expect(enabledViewer).toContain('href="/slides/deck1/print"');
    expect(enabledViewer).toContain('data-hono-decks-print="true"');
    expect(enabledViewer).toContain('data-hono-decks-print-path="/slides/deck1/print"');
    const disabledEmbed = await (await app.request("/slides/deck1/embed")).text();
    const enabledEmbed = await (
      await app.request("/slides/deck1/embed", { headers: { "x-print-enabled": "1" } })
    ).text();
    expect(disabledEmbed).not.toContain('data-hono-decks-print="true"');
    expect(disabledEmbed).not.toContain(' data-hono-decks-print-path="');
    expect(enabledEmbed).not.toContain('data-hono-decks-print="true"');
    expect(enabledEmbed).toContain('data-hono-decks-print-path="/slides/deck1/print"');
    expect(enabledEmbed).toContain('data-hono-decks-viewer-link="true"');
    expect(enabledEmbed).toContain('href="/slides/deck1"');
    expect((await app.request("/slides/deck1/print")).status).toBe(404);
    expect((await app.request("/slides/deck1/print", { headers: { "x-print-enabled": "1" } })).status).toBe(200);
  });

  it("keeps viewer pagination in query parameters", async () => {
    const app = new Hono();
    app.route("/slides", decksRouter({ source: manifestDeckSource({ decks: [deck] }) }));

    const response = await app.request("/slides/deck1?slide=2&step=1&ignored=yes");
    expect(response.status).toBe(200);
    const html = await response.text();

    expect(html).toContain('src="/slides/deck1/render?slide=2&amp;step=1"');
    expect(html).toContain("writeViewerPaginationState(message)");
    expect(html).not.toContain("ignored=yes");
  });

  it("resolves dev mode from the request context", async () => {
    const draftDeck = {
      ...deck,
      meta: { ...deck.meta, draft: true },
    } satisfies CompiledDeck;
    const app = new Hono();
    app.route(
      "/slides",
      decksRouter({
        source: manifestDeckSource({ decks: [draftDeck] }),
        dev: ({ c }) => c.req.header("x-runtime-dev") === "1",
        presenter: {
          enabled: ({ dev }) => dev,
        },
      }),
    );

    expect((await app.request("/slides/deck1")).status).toBe(404);
    expect((await app.request("/slides/deck1/presenter")).status).toBe(404);

    const viewer = await app.request("/slides/deck1", { headers: { "x-runtime-dev": "1" } });
    expect(viewer.status).toBe(200);

    const presenter = await app.request("/slides/deck1/presenter", {
      headers: { "x-runtime-dev": "1" },
    });
    expect(presenter.status).toBe(200);
  });

  it("infers dev mode from Vite and Wrangler NODE_ENV defaults", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const draftDeck = {
      ...deck,
      meta: { ...deck.meta, draft: true },
    } satisfies CompiledDeck;
    const source = manifestDeckSource({ decks: [draftDeck] });

    try {
      process.env.NODE_ENV = "development";

      const automatic = new Hono();
      automatic.route("/slides", decksRouter({ source }));
      expect((await automatic.request("/slides/deck1")).status).toBe(200);

      const disabled = new Hono();
      disabled.route("/slides", decksRouter({ source, dev: false }));
      expect((await disabled.request("/slides/deck1")).status).toBe(404);

      const resolved = new Hono();
      resolved.route("/slides", decksRouter({ source, dev: () => false }));
      expect((await resolved.request("/slides/deck1")).status).toBe(404);

      process.env.NODE_ENV = "production";

      const production = new Hono();
      production.route("/slides", decksRouter({ source }));
      expect((await production.request("/slides/deck1")).status).toBe(404);

      process.env.NODE_ENV = "staging";

      const unknown = new Hono();
      unknown.route("/slides", decksRouter({ source }));
      expect((await unknown.request("/slides/deck1")).status).toBe(404);
    } finally {
      if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = originalNodeEnv;
    }
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
    expect(html).not.toContain("data-hono-decks-controls");
  });

  it("serves a print rendering page with the A4 handout layout", async () => {
    const app = new Hono();
    app.route("/slides", decksRouter({ source: manifestDeckSource({ decks: [deck] }) }));

    const response = await app.request("/slides/deck1/print");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    const html = await response.text();
    expect(html).toContain("<h1>Intro</h1>");
    expect(html).toContain('<html lang="ja" data-hono-decks-print-preview="true">');
    expect(html).toContain('data-hono-decks-print-preview="true"');
    expect(html).toContain("@page{size:A4 portrait;margin:12mm}");
    expect(html).toContain(
      "html[data-hono-decks-print-preview]{width:auto;height:auto;min-height:100%;overflow:visible}",
    );
    expect(html).toContain(".slide:nth-of-type(3n):not(:last-child){page-break-after:always;break-after:page}");
    expect(html).toContain("body:not([data-overview-mode]) .slide{position:relative}");
    expect(html).toContain(".slide.layout-cover,.slide.layout-statement{display:block}");
    expect(html).toContain("zoom:var(--hono-decks-print-scale)");
    expect(html).toContain(
      ".hono-decks-embed-viewport iframe,.hono-decks-tweet-embed iframe,.hono-decks-tweet-embed .twitter-tweet{display:none!important}",
    );
    expect(html).toContain('params.get("autoprint") !== "1"');
    expect(html).toContain("window.requestAnimationFrame(() => window.print())");
    expect(html).not.toContain("function fitDeck()");
    expect(html).not.toContain('window.addEventListener("message"');
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
        client: { url: "/assets/slides.client.js" },
        components: {
          Badge: (props) => jsx("strong", { class: "badge", children: String(props.label) }),
        },
      }),
    );

    const html = await (await app.request("/slides/deck1/render")).text();

    expect(html).toContain('class="badge"');
    expect(html).toContain("Worker-safe");
    expect(html).toContain(
      '<script data-hono-decks-client-entry type="module" src="/assets/slides.client.js"></script>',
    );
  });

  it("renders deck-local theme CSS only in deck render and print routes", async () => {
    const themedDeck = {
      ...deck,
      themeStyle: ".deck-local-theme{color:cyan}",
      themeSourcePath: "decks/deck1/theme.css",
    } satisfies CompiledDeck;
    const app = new Hono();
    app.route("/slides", decksRouter({ source: manifestDeckSource({ decks: [themedDeck] }) }));

    const viewerHtml = await (await app.request("/slides/deck1")).text();
    const renderHtml = await (await app.request("/slides/deck1/render")).text();
    const printHtml = await (await app.request("/slides/deck1/print")).text();

    expect(viewerHtml).not.toContain(".deck-local-theme{color:cyan}");
    expect(renderHtml).toContain(".deck-local-theme{color:cyan}");
    expect(printHtml).toContain(".deck-local-theme{color:cyan}");
  });

  it("omits the generated client entry on explicitly static decks while preserving app overrides", async () => {
    const source = manifestDeckSource({ decks: [{ ...deck, clientEntryRequired: false }] });
    const app = new Hono();
    app.route("/slides", decksRouter({ source, client: { bundle: "console.log('islands');" } }));
    expect(await (await app.request("/slides/deck1/render")).text()).not.toContain("/_assets/client");
    const custom = new Hono();
    custom.route("/slides", decksRouter({ source, client: { url: "/custom.js", bundle: "unused" } }));
    expect(await (await custom.request("/slides/deck1/render")).text()).toContain('src="/custom.js"');
  });

  it("serves an embedded client entry asset from the mounted router", async () => {
    const app = new Hono();
    app.route(
      "/slides",
      decksRouter({
        source: manifestDeckSource({ decks: [deck] }),
        client: { bundle: "console.log('deck client');" },
      }),
    );

    const renderHtml = await (await app.request("/slides/deck1/render")).text();
    const asset = await app.request("/slides/_assets/client");

    expect(renderHtml).toContain(
      '<script data-hono-decks-client-entry type="module" src="/slides/_assets/client"></script>',
    );
    expect(asset.status).toBe(200);
    expect(asset.headers.get("content-type")).toContain("text/javascript");
    expect(asset.headers.get("cache-control")).toBe("no-cache");
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

  it("lets an explicit client URL override the generated asset URL", async () => {
    const app = new Hono();
    app.route(
      "/slides",
      decksRouter({
        source: manifestDeckSource({ decks: [deck] }),
        client: { url: "/assets/slides.client.js", bundle: "console.log('deck client');" },
      }),
    );

    const renderHtml = await (await app.request("/slides/deck1/render")).text();

    expect(renderHtml).toContain(
      '<script data-hono-decks-client-entry type="module" src="/assets/slides.client.js"></script>',
    );
    expect(renderHtml).not.toContain("/slides/_assets/client");
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
        liveReloadPath: "/decks/events",
      }),
    );

    const wrapperHtml = await (await app.request("/decks/deck1")).text();
    const renderHtml = await (await app.request("/decks/deck1/render")).text();

    expect(wrapperHtml).not.toContain("new EventSource");
    expect(renderHtml).toContain("new EventSource");
    expect(renderHtml).toContain('new EventSource("/decks/events")');

    const production = new Hono();
    production.route(
      "/decks",
      decksRouter({
        source: manifestDeckSource({ decks: [deck] }),
        dev: false,
        liveReloadPath: "/events",
      }),
    );
    expect(await (await production.request("/decks/deck1/render")).text()).not.toContain("new EventSource");
  });

  it("serves local deck assets and returns 404 for missing slugs", async () => {
    const app = new Hono();
    app.route("/decks", decksRouter({ source: manifestDeckSource({ decks: [deck] }) }));

    const asset = await app.request("/decks/deck1/assets/image.png");
    expect(asset.status).toBe(200);
    expect(asset.headers.get("content-type")).toBe("image/png");

    const missing = await app.request("/decks/missing");
    expect(missing.status).toBe(404);
    expect(await missing.text()).toBe("404 Not Found");
  });
});
