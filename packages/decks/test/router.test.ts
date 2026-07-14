import { Hono } from "hono";
import { jsx } from "hono/jsx/jsx-runtime";
import { describe, expect, it } from "vitest";
import type { CompiledDeck } from "../src/deck/model";
import { defineDecks, defineDecksConfig } from "../src/server/define-decks";
import { manifestDeckSource } from "../src/source/manifest-source";
import { withR2Assets } from "../src/source/r2-assets";
import { createDeckViewerEmbed, createDeckViewerParts, deckContext, decksRouter } from "../src/server/router";
import type { DeckContextVariables, DeckViewerControlsOptions } from "../src/server/router";

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
    expect(html).toContain(".hono-decks-viewport{width:min(100%,calc((100vh - 58px) * 16 / 9));aspect-ratio:16/9");
    expect(html).toContain(".hono-decks-viewport:focus-visible");
    expect(html).toContain("*:focus-visible{outline:none}");
    expect(html).toContain(".hono-decks-frame-stage{width:100%;height:100%");
    expect(html).toContain(".hono-decks-frame-stage iframe{width:100%;height:100%");
    expect(html).not.toContain(".hono-decks-frame-stage iframe{width:100%;height:100%;border:0;display:block;background:");
    expect(html).toContain("@media (prefers-reduced-motion: reduce)");
    expect(html).not.toContain('width="1920"');
    expect(html).not.toContain('height="1080"');
    expect(html).not.toContain("DESIGN_WIDTH");
    expect(html).not.toContain("stage.style.transform");
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('data-viewer-navigation="previous"');
    expect(html).toContain('data-viewer-navigation="next"');
    expect(html).toContain(".hono-decks-viewer-navigation-layer{position:absolute;top:0;bottom:0;width:50%");
    expect(html).toContain(".hono-decks-viewport>[data-hono-decks-position]{position:absolute;left:50%");
    expect(html).toContain('@media (orientation:landscape) and (max-height:600px)');
    expect(html).toContain("grid-template-columns:minmax(0,1fr) auto");
    expect(html).toContain(".hono-decks-viewer-controls{flex-direction:column}");
    expect(html).toContain('@media (pointer:coarse)');
    expect(html).toContain('.hono-decks-viewer-controls [data-hono-decks-navigation-control="fullscreen"],.hono-decks-viewer-controls [data-hono-decks-print]{display:none}');
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
    expect(html).toContain('data-hono-decks-back-link');
    expect(html).toContain("message.stepCount");
    expect(html).toContain("writeViewerPaginationState(message)");
    expect(html).toContain('params.set("slide", String(message.index + 1))');
    expect(html).toContain('content="width=device-width, initial-scale=1, viewport-fit=cover"');
    expect(html).toContain("@supports (height:100dvh)");
    expect(html).toContain("grid-template-rows:minmax(0,1fr) auto");
    expect(html).toContain("padding:env(safe-area-inset-top,0)");
    expect(html).toContain("container-type:size");
    expect(html).toContain(".hono-decks-viewer-stage{display:grid;place-items:center;justify-content:center");
    expect(html).toContain("@supports (width:1cqw)");
    expect(html).not.toContain("position:fixed;left:50%;bottom:16px");
    expect(html).toContain("root.setAttribute(\"data-step-index\", String(message.stepIndex ?? 0))");
    expect(html).toContain("root.setAttribute(\"data-step-count\", String(message.stepCount ?? 0))");
    expect(html).not.toContain('String(message.stepIndex) + " / " + String(message.stepCount)');
    expect(html).toContain("pointerdown");
    expect(html).toContain("pointerup");
    expect(html).toContain("pointercancel");
    expect(html).toContain("touch-action:pan-y");
    expect(html).toContain("suppressNavigationClick = true");
    expect(html).toContain('orientation.lock("landscape")');
    expect(html).toContain("unlockViewerOrientation()");
    expect(html).toContain('document.addEventListener("fullscreenchange"');
    expect(html).toContain('root.querySelectorAll("[data-action=\'previous\']")');
    expect(html).toContain('root.querySelectorAll("[data-action=\'next\']")');
    expect(html).toContain('root.querySelectorAll("[data-action=\'fullscreen\']")');
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

      for (const tag of html.match(/<(?:style|script)\b[^>]*>/g) ?? []) {
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
    expect((await app.request("/slides/deck1", { headers: { "x-viewer-enabled": "1" } })).status).toBe(200);
    expect((await app.request("/slides/deck1/render")).status).toBe(404);
    expect((await app.request("/slides/deck1/render", { headers: { "x-render-enabled": "1" } })).status).toBe(200);
    expect((await app.request("/slides/deck1/print")).status).toBe(404);
    expect((await app.request("/slides/deck1/presentation")).status).toBe(404);
    expect((await app.request("/slides/deck1/presenter")).status).toBe(404);
  });

  it("mounts a safe request-aware external embed document from router options", async () => {
    const app = new Hono();
    app.use("/slides/*", async (c, next) => {
      c.header("content-security-policy", "default-src 'none'; frame-ancestors https://old.example.com");
      c.header("x-frame-options", "DENY");
      await next();
    });
    app.route(
      "/slides",
      decksRouter({
        source: manifestDeckSource({ decks: [deck] }),
        embed: {
          frameAncestors: ({ c }) => c.req.header("x-frame-ancestors"),
          document: {
            lang: "en",
            nonce: "embed-nonce",
            head: jsx("meta", { name: "embed-tenant", content: "docs" }),
          },
          viewer: {
            className: "product-tour",
            controls: false,
          },
          pageStyle: ".product-tour{isolation:isolate}",
          render: ({ viewer }) => jsx("main", { "data-custom-embed": true, children: viewer.embed }),
        },
      }),
    );

    const response = await app.request("/slides/deck1/embed", {
      headers: {
        "x-frame-ancestors":
          "https://blog.example.com, https://notes.example.net/article javascript:alert(1)",
      },
    });
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-security-policy")).toBe(
      "default-src 'none'; frame-ancestors 'self' https://blog.example.com https://notes.example.net",
    );
    expect(response.headers.get("x-frame-options")).toBeNull();
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    expect(html).toContain('<html lang="en" data-hono-decks-external-embed-document>');
    expect(html).toContain('<meta name="embed-tenant" content="docs"/>');
    expect(html).toContain('data-custom-embed="true"');
    expect(html).toContain('class="hono-decks-embedded-viewer product-tour"');
    expect(html).toContain(".product-tour{isolation:isolate}");
    expect(html).not.toContain("data-hono-decks-viewer-controls");
    for (const tag of html.match(/<(?:style|script)\b[^>]*>/g) ?? []) {
      expect(tag).toContain('nonce="embed-nonce"');
    }
  });

  it("keeps external embedding opt-in, same-origin by default, and request-disableable", async () => {
    const source = manifestDeckSource({ decks: [deck] });
    const withoutEmbed = new Hono();
    withoutEmbed.route("/slides", decksRouter({ source }));
    expect((await withoutEmbed.request("/slides/deck1/embed")).status).toBe(404);

    const withEmbed = new Hono();
    withEmbed.route(
      "/slides",
      decksRouter({
        source,
        embed: { enabled: ({ c }) => c.req.header("x-embed-enabled") === "1" },
      }),
    );
    expect((await withEmbed.request("/slides/deck1/embed")).status).toBe(404);

    const enabled = await withEmbed.request("/slides/deck1/embed", { headers: { "x-embed-enabled": "1" } });
    expect(enabled.status).toBe(200);
    expect(enabled.headers.get("content-security-policy")).toBe("frame-ancestors 'self'");
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

  it("keeps presenter pagination in query parameters", async () => {
    const app = new Hono();
    app.route("/slides", decksRouter({ source: manifestDeckSource({ decks: [deck] }) }));

    const response = await app.request("/slides/deck1/presenter?slide=2&step=1&ignored=yes");
    expect(response.status).toBe(200);
    const html = await response.text();

    expect(html).toContain('href="/slides/deck1?slide=2&amp;step=1"');
    expect(html).toContain('src="/slides/deck1/presentation?slide=2&amp;step=1"');
    expect(html).toContain('data-projection-url="/slides/deck1/presentation?slide=2&amp;step=1"');
    expect(html).toContain("writePresenterPaginationState()");
    expect(html).toContain('url.searchParams.set("slide", String(currentIndex + 1))');
    expect(html).not.toContain("ignored=yes");
  });

  it("serves a clean projection route and a presenter route with next preview and speaker notes", async () => {
    const presentationDeck = {
      ...deck,
      slides: [
        {
          index: 0,
          meta: { title: "Intro", layout: "cover", meta: {} },
          html: "<h1>Intro</h1>",
          notes: "Open with the Worker runtime boundary.",
          components: [],
        },
        {
          index: 1,
          meta: { title: "Next Steps", layout: "default", meta: {} },
          html: "<h2>Next Steps</h2>",
          notes: "Point people to the presenter route.",
          components: [],
        },
      ],
    } satisfies CompiledDeck;
    const app = new Hono();
    app.route("/slides", decksRouter({ source: manifestDeckSource({ decks: [presentationDeck] }) }));

    const projection = await app.request("/slides/deck1/presentation");
    expect(projection.status).toBe(200);
    const projectionHtml = await projection.text();
    expect(projectionHtml).toContain("data-hono-decks-projection");
    expect(projectionHtml).toContain("<h1>Intro</h1>");
    expect(projectionHtml).toContain("hono-decks:state");
    expect(projectionHtml).toContain("window.opener.postMessage");
    expect(projectionHtml).not.toContain("data-hono-decks-viewer-controls");
    expect(projectionHtml).not.toContain("data-hono-decks-back-link");
    expect(projectionHtml).not.toContain("Open with the Worker runtime boundary.");

    const presenter = await app.request("/slides/deck1/presenter");
    expect(presenter.status).toBe(200);
    const presenterHtml = await presenter.text();
    expect(presenterHtml).toContain("data-hono-decks-presenter");
    expect(presenterHtml).toContain("data-hono-decks-presenter-current");
    expect(presenterHtml).toContain('src="/slides/deck1/presentation"');
    expect(presenterHtml).toContain("data-hono-decks-presenter-next");
    expect(presenterHtml).toContain("<h2>Next Steps</h2>");
    expect(presenterHtml).toContain(
      ".hono-decks-presenter-preview{position:relative;aspect-ratio:16/9;overflow:hidden;",
    );
    expect(presenterHtml).toContain(
      "body:not([data-overview-mode]) .hono-decks-presenter-preview .slide{position:absolute;inset:0 auto auto 0;width:var(--hono-decks-width);height:var(--hono-decks-height);",
    );
    expect(presenterHtml).toContain("function fitPresenterPreview(preview)");
    expect(presenterHtml).toMatch(
      /data-hono-decks-presenter-preview data-slide-index="1"[^>]*><section[^>]*data-slide-state="active"/,
    );
    expect(presenterHtml).toContain("data-hono-decks-presenter-notes");
    expect(presenterHtml).toContain("Open with the Worker runtime boundary.");
    expect(presenterHtml).toContain("Point people to the presenter route.");
    expect(presenterHtml).not.toContain("data-hono-decks-viewer-controls");
  });

  it("gates the presenter route and viewer control link from router options", async () => {
    const app = new Hono();
    app.route(
      "/slides",
      decksRouter({
        source: manifestDeckSource({ decks: [deck] }),
        presenter: {
          enabled: ({ c, dev, presenterPath, presentationPath }) => {
            expect(dev).toBe(false);
            expect(presenterPath).toBe("/slides/deck1/presenter");
            expect(presentationPath).toBe("/slides/deck1/presentation");
            return c.req.header("x-presenter-enabled") === "1";
          },
          viewerControl: {
            label: "Present",
            attributes: { "data-presenter-control": "enabled" },
          },
        },
      }),
    );

    const disabledPresenter = await app.request("/slides/deck1/presenter");
    expect(disabledPresenter.status).toBe(404);

    const disabledViewerHtml = await (await app.request("/slides/deck1")).text();
    expect(disabledViewerHtml).not.toContain('href="/slides/deck1/presenter"');
    expect(disabledViewerHtml).not.toContain('data-presenter-control="enabled"');

    const enabledPresenter = await app.request("/slides/deck1/presenter", {
      headers: { "x-presenter-enabled": "1" },
    });
    expect(enabledPresenter.status).toBe(200);

    const enabledViewerHtml = await (
      await app.request("/slides/deck1", {
        headers: { "x-presenter-enabled": "1" },
      })
    ).text();
    expect(enabledViewerHtml).toContain('href="/slides/deck1/presenter"');
    expect(enabledViewerHtml).toContain('data-presenter-control="enabled"');
    expect(enabledViewerHtml).toContain('aria-label="Present"');
    expect(enabledViewerHtml).toContain("data-hono-decks-control-icon");
    expect(enabledViewerHtml).not.toContain(">Present</a>");
  });

  it("does not resolve presenter viewer control when viewer controls are disabled", async () => {
    const app = new Hono();
    let calls = 0;
    app.route(
      "/slides",
      decksRouter({
        source: manifestDeckSource({ decks: [deck] }),
        viewer: { controls: false },
        presenter: {
          enabled: () => {
            calls += 1;
            return true;
          },
          viewerControl: true,
        },
      }),
    );

    const response = await app.request("/slides/deck1");

    expect(response.status).toBe(200);
    expect(calls).toBe(0);
  });

  it("renders presenter controls and guards state messages to the projection frame", async () => {
    const app = new Hono();
    app.route("/slides", decksRouter({ source: manifestDeckSource({ decks: [deck] }) }));

    const presenter = await app.request("/slides/deck1/presenter");
    const presenterHtml = await presenter.text();

    expect(presenter.status).toBe(200);
    expect(presenterHtml).toContain("data-hono-decks-presenter-controls");
    expect(presenterHtml).toContain('href="/slides"');
    expect(presenterHtml).toContain('href="/slides/deck1"');
    expect(presenterHtml).toContain('data-action="openProjection"');
    expect(presenterHtml).toContain('data-projection-url="/slides/deck1/presentation"');
    expect(presenterHtml).toContain("window.open(url.href");
    expect(presenterHtml).toContain("projectionWindow?.postMessage");
    expect(presenterHtml).toContain("function syncProjectionState(source, index, stepIndex)");
    expect(presenterHtml).toContain("if (event.source !== frame?.contentWindow) projectionWindow = event.source");
    expect(presenterHtml).toContain('action: "goTo", index, stepIndex');
    expect(presenterHtml).toContain("width=1920,height=1080");
    expect(presenterHtml).toContain("data-hono-decks-control-icon");
    expect(presenterHtml).toContain("pointer-events:none");
    expect(presenterHtml).not.toContain("hono-decks-presenter-control-text");
    expect(presenterHtml).toContain('d="M3 11l9-8 9 8"');
    expect(presenterHtml).toContain('d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"');
    expect(presenterHtml).toContain('aria-label="Deck list"');
    expect(presenterHtml).toContain('aria-label="Viewer"');
    expect(presenterHtml).toContain('aria-label="Projection"');
    expect(presenterHtml).toContain('data-action="previous"');
    expect(presenterHtml).toContain('data-action="next"');
    expect(presenterHtml).toContain("data-hono-decks-presenter-position");
    expect(presenterHtml).not.toContain("data-hono-decks-presenter-clock");
    expect(presenterHtml).not.toContain("updateClock");
    expect(presenterHtml).not.toContain("setInterval");
    expect(presenterHtml).toContain("data-hono-decks-presenter-connection");
    expect(presenterHtml).toContain("syncProjectionState(event.source, message.index, stepIndex)");
    expect(presenterHtml).toContain("event.origin !== window.location.origin");
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
        dev: (c) => c.req.header("x-runtime-dev") === "1",
        presenter: {
          enabled: ({ dev }) => dev,
        },
      }),
    );

    expect((await app.request("/slides/deck1")).status).toBe(404);
    expect((await app.request("/slides/deck1/presenter")).status).toBe(404);

    const viewer = await app.request("/slides/deck1", { headers: { "x-runtime-dev": "1" } });
    expect(viewer.status).toBe(200);

    const presenter = await app.request("/slides/deck1/presenter", { headers: { "x-runtime-dev": "1" } });
    expect(presenter.status).toBe(200);
  });

  it("keeps the presenter next preview height when there is no next slide", async () => {
    const app = new Hono();
    app.route("/slides", decksRouter({ source: manifestDeckSource({ decks: [deck] }) }));

    const presenter = await app.request("/slides/deck1/presenter");
    expect(presenter.status).toBe(200);
    const presenterHtml = await presenter.text();
    expect(presenterHtml).toContain(
      ".hono-decks-presenter-no-next:not([hidden]){display:grid;place-items:center;aspect-ratio:16/9;",
    );
    expect(presenterHtml).toContain(
      '<p class="hono-decks-presenter-no-next" data-hono-decks-presenter-no-next>No next slide</p>',
    );
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

  it("returns null controls parts when viewer controls are disabled", async () => {
    const parts = await createDeckViewerParts({
      deck,
      mountPath: "/slides",
      controls: false,
    });

    expect(parts.controls).toBeNull();
    expect(parts.controlsHtml).toBeNull();
  });

  it("creates a self-contained interactive embed that can coexist with other viewers", async () => {
    const first = await createDeckViewerEmbed({ deck, mountPath: "/slides", toc: true });
    const second = await createDeckViewerEmbed({
      deck: { ...deck, slug: "deck2", meta: { ...deck.meta, title: "Deck Two" } },
      mountPath: "/slides",
      controls: false,
      className: "product-tour",
      nonce: "embed-nonce",
    });

    const html = `${first.embedHtml}${second.embedHtml}`;
    expect(html).toContain("data-hono-decks-embed");
    expect(html).toContain("data-hono-decks-embed-style");
    expect(html).not.toMatch(/\.hono-decks-viewer-shell\{[^}]*gap:12px/);
    expect(first.embedHtml).toMatch(/\[data-hono-decks-viewer\]\[data-hono-decks-embed\] \.hono-decks-viewer-controls\{[^}]*z-index:4/);
    expect(html).toContain('[data-hono-decks-viewer][data-hono-decks-embed] *:focus-visible{outline:none}');
    expect(html).toContain("data-hono-decks-viewer-runtime");
    expect(html).toContain('data-hono-decks-print-path="/slides/deck1/print"');
    expect(html).toContain('class="hono-decks-embedded-viewer product-tour"');
    expect(second.embedHtml).toContain('data-hono-decks-embed-style nonce="embed-nonce"');
    expect(second.embedHtml).toContain('data-hono-decks-viewer-runtime nonce="embed-nonce"');
    expect(html).toContain('src="/slides/deck2/render"');
    expect(html).toContain("for (const root of roots)");
    expect(html).toContain("window.__honoDecksViewerRuntime ??=");
    expect(html).toContain("if (!runtime.globalInitialized)");
    expect(html).toContain('root.querySelector("iframe")');
    expect(html).toContain("event.source !== iframe?.contentWindow");
    expect(html).toContain("event.origin !== frameOrigin");
    expect(html).toContain("action, index }, frameOrigin");
    expect(html).toContain('root.setAttribute("data-hono-decks-initialized", "true")');
    expect(html).toContain("document.activeElement?.closest?.");
    expect(first.embedHtml).toContain("data-hono-decks-toc");
    expect(second.embedHtml).not.toContain("data-hono-decks-toc");
  });

  it("passes request context to viewer rendering and supports a request-aware document language and head", async () => {
    type AppEnv = { Bindings: { LOCALE: string; TENANT: string; NONCE: string } };
    const app = new Hono<AppEnv>();
    app.route(
      "/slides",
      decksRouter<AppEnv>({
        source: manifestDeckSource<AppEnv>({ decks: [deck] }),
        viewer: {
          lang: ({ c }) => c.env.LOCALE,
          nonce: ({ c }) => c.env.NONCE,
          head: ({ c }) => jsx("meta", { name: "tenant", content: c.env.TENANT }),
          render: ({ c, frame }) => jsx("section", { "data-tenant": c.env.TENANT, children: frame }),
        },
      }),
    );

    const html = await (
      await app.request("/slides/deck1", undefined, { LOCALE: "en-GB", TENANT: "docs", NONCE: "request-nonce" })
    ).text();
    expect(html).toContain('<html lang="en-GB">');
    expect(html).toContain('<meta name="tenant" content="docs"/>');
    expect(html).toContain('data-tenant="docs"');
    expect(html).toContain('<style nonce="request-nonce">');
    expect(html).toContain('data-hono-decks-viewer-runtime nonce="request-nonce"');
    expect(html).toContain('data-hono-decks-print-path="/slides/deck1/print"');
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
    expect(html).toContain('sendCommand("goTo", index)');
  });

  it("lets callers reorder and remove default viewer control items", async () => {
    const app = new Hono();
    app.route(
      "/slides",
      decksRouter({
        source: manifestDeckSource({ decks: [deck] }),
        viewer: {
          controls: {
            items: (defaults) => [defaults.next, defaults.position, defaults.previous, defaults.back],
          },
        },
      }),
    );

    const html = await (await app.request("/slides/deck1")).text();

    expect(html).toContain('href="/slides"');
    expect(html).toContain('data-action="previous"');
    expect(html).toContain('data-action="next"');
    expect(html).not.toContain('data-action="fullscreen"');
    expect(html.indexOf('data-action="next"')).toBeLessThan(html.indexOf('data-slide-position'));
    expect(html.indexOf('data-slide-position')).toBeLessThan(html.indexOf('data-action="previous"'));
    expect(html.indexOf('data-action="previous"')).toBeLessThan(html.indexOf('data-hono-decks-back-link'));
  });

  it("lets callers customize default controls with diff-style options", async () => {
    const app = new Hono();
    app.route(
      "/slides",
      decksRouter({
        source: manifestDeckSource({ decks: [deck] }),
        viewer: {
          controls: {
            className: "custom-controls",
            itemClassName: "custom-control-item",
            attributes: {
              "data-controls-shell": "diff",
              "aria-label": "ignored",
            },
            ariaLabel: "Deck controls",
            hidden: ["fullscreen"],
            labels: {
              previous: "Back <",
              next: "Forward >",
            },
            before: [
              {
                type: "link",
                href: "/home?from=<deck>",
                label: "Home <Deck>",
                className: "home-control",
                attributes: { "data-extra": "home" },
              },
            ],
            after: (context) => [
              {
                type: "link",
                href: `${context.meta.canonicalPath}/about`,
                label: "Details",
                attributes: { "data-extra": "details" },
              },
            ],
          },
        },
      }),
    );

    const html = await (await app.request("/slides/deck1")).text();

    expect(html).toContain('class="hono-decks-viewer-controls custom-controls"');
    expect(html).toContain('aria-label="Deck controls"');
    expect(html).toContain('data-controls-shell="diff"');
    expect(html).toContain('href="/home?from=&lt;deck&gt;"');
    expect(html).toContain('class="custom-control-item home-control"');
    expect(html).toContain(">Home &lt;Deck&gt;</a>");
    expect(html).toContain(">Back &lt;</button>");
    expect(html).toContain(">Forward &gt;</button>");
    expect(html).toContain('href="/slides/deck1/about"');
    expect(html).toContain('data-extra="details"');
    expect(html).not.toContain('data-action="fullscreen"');
    expect(html.indexOf('data-extra="home"')).toBeLessThan(html.indexOf('data-hono-decks-back-link'));
    expect(html.indexOf('data-action="next"')).toBeLessThan(html.indexOf('data-extra="details"'));
  });

  it("keeps items as a full override while applying labels and renderItem", async () => {
    const app = new Hono();
    app.route(
      "/slides",
      decksRouter({
        source: manifestDeckSource({ decks: [deck] }),
        viewer: {
          controls: {
            hidden: ["next"],
            before: [{ type: "link", href: "/ignored", label: "Ignored" }],
            labels: { next: "Forward" },
            items: (defaults) => [defaults.next],
            renderItem: (item, _context, renderDefault) => {
              if (item.type === "default" && item.key === "next") {
                return jsx("span", {
                  "data-rendered-control": item.label,
                  children: renderDefault(),
                });
              }
              return renderDefault();
            },
          },
        },
      }),
    );

    const html = await (await app.request("/slides/deck1")).text();

    expect(html).toContain('data-rendered-control="Forward"');
    expect(html).toContain('data-action="next"');
    expect(html).toContain(">Forward</button>");
    expect(html).not.toContain("Ignored");
    expect(html).not.toContain('data-action="previous"');
  });

  it("renders custom JSX control items in the viewer controls", async () => {
    const app = new Hono();
    app.route(
      "/slides",
      decksRouter({
        source: manifestDeckSource({ decks: [deck] }),
        viewer: {
          controls: {
            items: (defaults) => [
              {
                type: "render",
                key: "custom",
                render: ({ context }) =>
                  jsx("strong", {
                    "data-render-control": context.slug,
                    children: "Custom JSX",
                  }),
              },
              defaults.position,
            ],
          },
        },
      }),
    );

    const html = await (await app.request("/slides/deck1")).text();

    expect(html).toContain('<strong data-render-control="deck1">Custom JSX</strong>');
    expect(html).toContain('data-slide-position');
    expect(html).not.toContain('data-action="previous"');
  });

  it("lets callers replace the back link and add escaped custom link items", async () => {
    const app = new Hono();
    app.route(
      "/slides",
      decksRouter({
        source: manifestDeckSource({ decks: [deck] }),
        viewer: {
          controls: {
            className: "custom-controls",
            itemClassName: "custom-control-item",
            items: (defaults, context) => [
              {
                type: "link",
                key: "home",
                href: `/library?deck=${context.slug}&name=<Deck One>`,
                label: "Library <Home>",
                className: "custom-link-item",
                attributes: {
                  "data-custom-control": "home",
                  "aria-current": true,
                  "data-hidden": false,
                },
              },
              {
                ...defaults.position,
                className: "custom-position-item",
                attributes: {
                  "data-position-control": "<position>",
                  "data-slide-position": "ignored",
                },
              },
            ],
          },
        },
      }),
    );

    const html = await (await app.request("/slides/deck1")).text();

    expect(html).toContain('class="hono-decks-viewer-controls custom-controls"');
    expect(html).toContain('class="custom-control-item custom-link-item"');
    expect(html).toContain('class="custom-control-item custom-position-item"');
    expect(html).toContain('href="/library?deck=deck1&amp;name=&lt;Deck One&gt;"');
    expect(html).toContain(">Library &lt;Home&gt;</a>");
    expect(html).toContain('data-custom-control="home"');
    expect(html).toContain('data-position-control="&lt;position&gt;"');
    expect(html).toContain("data-slide-position");
    expect(html).toContain("aria-current");
    expect(html).not.toContain("data-hidden");
    expect(html).not.toContain('data-hono-decks-back-link');
    expect(html).not.toContain('data-action="previous"');
    expect(html).not.toContain('data-action="next"');
    expect(html).not.toContain('data-action="fullscreen"');
  });

  it("drops unsafe control attributes and link href schemes", async () => {
    const app = new Hono();
    app.route(
      "/slides",
      decksRouter({
        source: manifestDeckSource({ decks: [deck] }),
        viewer: {
          controls: {
            attributes: {
              onclick: "alert(1)",
              "data-safe-controls": "yes",
            },
            items: [
              {
                type: "link",
                href: "javascript:alert(1)",
                label: "Unsafe",
                attributes: {
                  onmouseover: "alert(2)",
                  "data-safe-link": "yes",
                },
              },
              {
                type: "link",
                href: "https://example.com/deck",
                label: "Safe",
              },
            ],
          },
        },
      }),
    );

    const html = await (await app.request("/slides/deck1")).text();

    expect(html).toContain('data-safe-controls="yes"');
    expect(html).toContain('data-safe-link="yes"');
    expect(html).toContain(">Unsafe</a>");
    expect(html).toContain('href="https://example.com/deck"');
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("onmouseover");
    expect(html).not.toContain("javascript:alert");
  });

  it("keeps default control action attributes from being overridden", async () => {
    const parts = await createDeckViewerParts({
      deck,
      mountPath: "/slides",
      exportPaths: { pdf: true, png: true },
      controls: {
        items: (defaults) => {
          if (!defaults.exportPdf || !defaults.exportPng) throw new Error("Expected export defaults");

          return [
            { ...defaults.back, attributes: { href: "/wrong", "data-hono-decks-back-link": false } },
            { ...defaults.previous, attributes: { type: "submit", "data-action": "next" } },
            { ...defaults.position, attributes: { "data-slide-position": false } },
            { ...defaults.next, attributes: { "data-action": "previous" } },
            { ...defaults.fullscreen, attributes: { "data-action": "next" } },
            {
              ...defaults.exportPdf,
              attributes: { href: "/wrong.pdf", download: "wrong.pdf", "data-hono-decks-export": "png" },
            },
            {
              ...defaults.exportPng,
              attributes: { href: "/wrong.png", download: "wrong.png", "data-hono-decks-export": "pdf" },
            },
          ];
        },
      },
    });
    const html = parts.controlsHtml ?? "";

    expect(html).toContain('href="/slides"');
    expect(html).toContain("data-hono-decks-back-link");
    expect(html).toContain('type="button"');
    expect(html).toContain('data-action="previous"');
    expect(html).toContain('data-action="next"');
    expect(html).toContain('data-action="fullscreen"');
    expect(html).toContain("data-slide-position");
    expect(html).toContain('href="/slides/deck1/export.pdf"');
    expect(html).toContain('download="Deck-One.pdf"');
    expect(html).toContain('data-hono-decks-export="pdf"');
    expect(html).toContain('href="/slides/deck1/export.png"');
    expect(html).toContain('download="Deck-One.png"');
    expect(html).toContain('data-hono-decks-export="png"');
    expect(html).not.toContain("/wrong");
    expect(html).not.toContain("wrong.pdf");
    expect(html).not.toContain("wrong.png");
    expect(html).not.toContain('type="submit"');
  });

  it("creates a router from a generated manifest with defineDecks", async () => {
    const decks = defineDecks({ manifest: { decks: [deck] } });
    const app = new Hono();

    app.route("/decks", decks.router());

    const response = await app.request("/decks/deck1/render");
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("<h1>Intro</h1>");
  });

  it("deeply composes nested router overrides without dropping unrelated defaults", async () => {
    const decks = defineDecks({
      manifest: { decks: [deck] },
      viewer: {
        lang: "en",
        style: ".base-viewer { color: red; }",
        controls: {
          className: "base-controls",
          labels: { previous: "Back" },
        },
      },
      presenter: {
        enabled: true,
        viewerControl: { label: "Speaker", icon: "presenter" },
      },
      document: {
        lang: "ja",
        head: jsx("meta", { name: "document-base", content: "base" }),
        surfaces: {
          render: { lang: "fr" },
        },
      },
    });
    const app = new Hono();
    app.route(
      "/decks",
      decks.router({
        viewer: {
          controls: {
            itemClassName: "override-item",
            labels: { next: "Forward" },
          },
        },
        presenter: { viewerControl: { className: "speaker-link" } },
        document: {
          nonce: "merged-nonce",
          surfaces: {
            viewer: { head: jsx("meta", { name: "viewer-override", content: "viewer" }) },
          },
        },
      }),
    );

    const html = await (await app.request("/decks/deck1")).text();
    const renderHtml = await (await app.request("/decks/deck1/render")).text();
    expect(html).toContain('<html lang="en">');
    expect(html).toContain(".base-viewer { color: red; }");
    expect(html).toContain("base-controls");
    expect(html).toContain("override-item");
    expect(html).toContain(">Back</button>");
    expect(html).toContain(">Forward</button>");
    expect(html).toContain("speaker-link");
    expect(html).toContain('aria-label="Speaker"');
    expect(html).toContain('<meta name="viewer-override" content="viewer"/>');
    expect(html).toContain('<style nonce="merged-nonce">');
    expect(renderHtml).toContain('<html lang="fr">');
    expect(renderHtml).toContain('<meta name="document-base" content="base"/>');
    expect(renderHtml).toContain('<style nonce="merged-nonce">');
  });

  it("defines typed deck runtime config without changing the object", () => {
    const config = defineDecksConfig({
      mountPath: "/slides",
      source: (source) => source,
      router: {
        dev: true,
      },
    });

    const source = manifestDeckSource({ decks: [deck] });

    expect(config.mountPath).toBe("/slides");
    expect(config.source?.(source)).toBe(source);
    expect(config.router?.dev).toBe(true);
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

  it("exports print pages through an opt-in Browser Run binding", async () => {
    const calls: Array<{ action: "pdf" | "screenshot"; input: Record<string, unknown> }> = [];
    const browser = {
      async quickAction(action: "pdf" | "screenshot", input: Record<string, unknown>) {
        calls.push({ action, input });
        return new Response(`${action}:${String(input.url)}`, {
          headers: { "content-type": action === "pdf" ? "application/pdf" : "image/png" },
        });
      },
    };
    const app = new Hono();
    app.route(
      "/slides",
      decksRouter({
        source: manifestDeckSource({ decks: [deck] }),
        export: {
          browser: () => browser,
          pdf: true,
          png: {
            filename: "deck-preview",
            request: {
              viewport: { deviceScaleFactor: 3 },
            },
          },
        },
      }),
    );

    const viewerHtml = await (await app.request("/slides/deck1")).text();
    const pdf = await app.request("http://localhost/slides/deck1/export.pdf");
    const png = await app.request("http://localhost/slides/deck1/export.png");

    expect(viewerHtml).toContain('href="/slides/deck1/export.pdf"');
    expect(viewerHtml).toContain('data-hono-decks-export="pdf"');
    expect(viewerHtml).toContain('href="/slides/deck1/export.png"');
    expect(viewerHtml).toContain('data-hono-decks-export="png"');

    expect(pdf.status).toBe(200);
    expect(pdf.headers.get("content-type")).toContain("application/pdf");
    expect(pdf.headers.get("content-disposition")).toBe('attachment; filename="Deck-One.pdf"');
    expect(await pdf.text()).toBe("pdf:http://localhost/slides/deck1/print");

    expect(png.status).toBe(200);
    expect(png.headers.get("content-type")).toContain("image/png");
    expect(png.headers.get("content-disposition")).toBe('attachment; filename="deck-preview.png"');
    expect(await png.text()).toBe("screenshot:http://localhost/slides/deck1/print");

    expect(calls).toHaveLength(2);
    expect(calls[0]).toMatchObject({
      action: "pdf",
      input: {
        url: "http://localhost/slides/deck1/print",
        gotoOptions: { waitUntil: "networkidle2", timeout: 45000 },
        pdfOptions: { format: "a4", printBackground: true, preferCSSPageSize: true },
      },
    });
    expect(calls[1]).toMatchObject({
      action: "screenshot",
      input: {
        url: "http://localhost/slides/deck1/print",
        gotoOptions: { waitUntil: "networkidle2", timeout: 45000 },
        viewport: { width: 794, height: 1123, deviceScaleFactor: 3 },
        screenshotOptions: { type: "png", fullPage: true },
      },
    });
  });

  it("exposes export defaults only when exports are authorized for viewer controls", async () => {
    const browser = {
      async quickAction(action: "pdf" | "screenshot", input: Record<string, unknown>) {
        return new Response(`${action}:${String(input.url)}`);
      },
    };
    const app = new Hono();
    app.route(
      "/slides",
      decksRouter({
        source: manifestDeckSource({ decks: [deck] }),
        viewer: {
          controls: {
            items: (defaults) => [defaults.exportPng, defaults.position, defaults.exportPdf],
          },
        },
        export: {
          authorize: (c) => c.req.header("x-owner") === "yes",
          browser: () => browser,
          pdf: true,
          png: true,
        },
      }),
    );

    const unauthorizedViewer = await (await app.request("/slides/deck1")).text();
    const authorizedViewer = await (await app.request("/slides/deck1", { headers: { "x-owner": "yes" } })).text();

    expect(unauthorizedViewer).not.toContain('data-hono-decks-export="pdf"');
    expect(unauthorizedViewer).not.toContain('data-hono-decks-export="png"');
    expect(unauthorizedViewer).toContain('data-slide-position');
    expect(authorizedViewer.indexOf('data-hono-decks-export="png"')).toBeLessThan(
      authorizedViewer.indexOf("data-slide-position"),
    );
    expect(authorizedViewer.indexOf("data-slide-position")).toBeLessThan(
      authorizedViewer.indexOf('data-hono-decks-export="pdf"'),
    );
  });

  it("authorizes Browser Run export links and direct export routes per request", async () => {
    const calls: Array<{ action: "pdf" | "screenshot"; input: Record<string, unknown> }> = [];
    const authorizeCalls: Array<{ format: "pdf" | "png"; slug: string }> = [];
    const browser = {
      async quickAction(action: "pdf" | "screenshot", input: Record<string, unknown>) {
        calls.push({ action, input });
        return new Response(`${action}:${String(input.url)}`, {
          headers: { "content-type": action === "pdf" ? "application/pdf" : "image/png" },
        });
      },
    };
    const app = new Hono();
    app.route(
      "/slides",
      decksRouter({
        source: manifestDeckSource({ decks: [deck] }),
        export: {
          authorize: (c, { deck, format }) => {
            authorizeCalls.push({ format, slug: deck.slug });
            return c.req.header("x-owner") === "yes";
          },
          browser: () => browser,
          pdf: true,
          png: true,
        },
      }),
    );

    const unauthorizedViewer = await (await app.request("/slides/deck1")).text();
    const unauthorizedPdf = await app.request("http://localhost/slides/deck1/export.pdf");
    const unauthorizedPng = await app.request("http://localhost/slides/deck1/export.png");

    expect(unauthorizedViewer).not.toContain('href="/slides/deck1/export.pdf"');
    expect(unauthorizedViewer).not.toContain('href="/slides/deck1/export.png"');
    expect(unauthorizedPdf.status).toBe(403);
    expect(unauthorizedPng.status).toBe(403);
    expect(await unauthorizedPdf.json()).toEqual({
      error: "Browser export not authorized",
      slug: "deck1",
      format: "pdf",
    });
    expect(await unauthorizedPng.json()).toEqual({
      error: "Browser export not authorized",
      slug: "deck1",
      format: "png",
    });
    expect(calls).toHaveLength(0);

    const authorizedViewer = await (await app.request("/slides/deck1", { headers: { "x-owner": "yes" } })).text();
    const authorizedPdf = await app.request("http://localhost/slides/deck1/export.pdf", {
      headers: { "x-owner": "yes" },
    });
    const authorizedPng = await app.request("http://localhost/slides/deck1/export.png", {
      headers: { "x-owner": "yes" },
    });

    expect(authorizedViewer).toContain('href="/slides/deck1/export.pdf"');
    expect(authorizedViewer).toContain('href="/slides/deck1/export.png"');
    expect(authorizedPdf.status).toBe(200);
    expect(authorizedPng.status).toBe(200);
    expect(await authorizedPdf.text()).toBe("pdf:http://localhost/slides/deck1/print");
    expect(await authorizedPng.text()).toBe("screenshot:http://localhost/slides/deck1/print");
    expect(calls).toHaveLength(2);
    expect(authorizeCalls).toEqual([
      { format: "pdf", slug: "deck1" },
      { format: "png", slug: "deck1" },
      { format: "pdf", slug: "deck1" },
      { format: "png", slug: "deck1" },
      { format: "pdf", slug: "deck1" },
      { format: "png", slug: "deck1" },
      { format: "pdf", slug: "deck1" },
      { format: "png", slug: "deck1" },
    ]);
  });

  it("keeps Browser Run export routes disabled by default", async () => {
    const app = new Hono();
    app.route("/slides", decksRouter({ source: manifestDeckSource({ decks: [deck] }) }));

    expect((await app.request("/slides/deck1/export.pdf")).status).toBe(404);
    expect((await app.request("/slides/deck1/export.png")).status).toBe(404);
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

  it("builds controlsHtml from the same configured viewer control items", async () => {
    const app = new Hono<{ Variables: DeckContextVariables }>();
    app.get(
      "/slides/:slug/embed",
      deckContext({
        source: manifestDeckSource({ decks: [deck] }),
        viewer: {
          controls: {
            items: (defaults, context) => [
              {
                type: "link",
                href: `${context.mountPath}/overview?deck=${context.slug}`,
                label: "Overview & Notes",
                attributes: { "data-custom-control": "overview" },
              },
              {
                type: "render",
                render: ({ context }) =>
                  jsx("span", {
                    "data-rendered-html-control": context.slug,
                    children: "Rendered HTML",
                  }),
              },
              defaults.next,
            ],
            labels: { next: "Forward" },
            renderItem: (item, _context, renderDefault) => {
              if (item.type === "default" && item.key === "next") {
                return jsx("span", { "data-html-render-item": item.label, children: renderDefault() });
              }
              return renderDefault();
            },
          },
        },
      }),
      (c) => c.html(`<article>${c.var.deckViewer.controlsHtml}</article>`),
    );

    const html = await (await app.request("/slides/deck1/embed")).text();

    expect(html).toContain('href="/slides/overview?deck=deck1"');
    expect(html).toContain(">Overview &amp; Notes</a>");
    expect(html).toContain('data-custom-control="overview"');
    expect(html).toContain('<span data-rendered-html-control="deck1">Rendered HTML</span>');
    expect(html).toContain('data-html-render-item="Forward"');
    expect(html).toContain('data-action="next"');
    expect(html).toContain(">Forward</button>");
    expect(html).not.toContain('data-action="previous"');
    expect(html).not.toContain('data-hono-decks-back-link');
  });

  it("reflects export paths in controlsHtml only when provided", async () => {
    const controls = {
      items: (defaults) => [defaults.exportPng, defaults.position, defaults.exportPdf],
    } satisfies DeckViewerControlsOptions;
    const withoutExports = await createDeckViewerParts({
      deck,
      mountPath: "/slides",
      controls,
    });
    const withExports = await createDeckViewerParts({
      deck,
      mountPath: "/slides",
      controls,
      exportPaths: { pdf: true, png: true },
    });

    expect(withoutExports.controlsHtml).not.toContain('data-hono-decks-export="pdf"');
    expect(withoutExports.controlsHtml).not.toContain('data-hono-decks-export="png"');
    expect(withoutExports.controlsHtml).toContain("data-slide-position");
    const exportedHtml = withExports.controlsHtml ?? "";
    expect(exportedHtml).toContain('href="/slides/deck1/export.png"');
    expect(exportedHtml).toContain('data-hono-decks-export="png"');
    expect(exportedHtml).toContain('href="/slides/deck1/export.pdf"');
    expect(exportedHtml).toContain('data-hono-decks-export="pdf"');
    expect(exportedHtml.indexOf('data-hono-decks-export="png"')).toBeLessThan(
      exportedHtml.indexOf("data-slide-position"),
    );
  });

  it("lets deckContext target a public mount path from custom admin routes", async () => {
    const app = new Hono<{ Variables: DeckContextVariables }>();
    app.get(
      "/admin/decks/:slug",
      deckContext({ source: manifestDeckSource({ decks: [deck] }), mountPath: "/decks" }),
      (c) =>
        c.json({
          renderUrl: c.var.deckViewer.renderUrl,
          canonicalPath: c.var.deckMeta.canonicalPath,
          printPath: c.var.deckMeta.printPath,
        }),
    );

    const response = await app.request("/admin/decks/deck1");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      renderUrl: "/decks/deck1/render",
      canonicalPath: "/decks/deck1",
      printPath: "/decks/deck1/print",
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
    expect(typeof mod.createDeckViewerEmbed).toBe("function");
    expect(typeof mod.mergeDecksRouterOptions).toBe("function");
  });
});
