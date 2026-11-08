import { Hono } from "hono";
import { jsx } from "hono/jsx/jsx-runtime";
import { describe, expect, it } from "vite-plus/test";
import { configureDecks } from "../src/server/define-decks";
import { manifestDeckSource } from "../src/source/manifest-source";
import { createDeckViewerEmbed, createDeckViewerParts, deckContext, decksRouter } from "../src/server/router";
import type { DeckContextVariables, DeckViewerControlsOptions } from "../src/server/router";
import { deck } from "./support/router-fixtures";

describe("decksRouter viewer page, controls, and social metadata", () => {
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

  it("emits absolute Open Graph and Twitter metadata from the canonical image path", async () => {
    const app = new Hono<{ Variables: DeckContextVariables }>();
    const describedDeck = {
      ...deck,
      meta: { ...deck.meta, description: 'Share <this> & "that"' },
    };
    const configured = configureDecks({ mountPath: "/slides", decks: [describedDeck] }, { viewer: { openGraph: {} } });
    app.get("/slides/:slug/meta", configured.context(), (c) => c.json(c.var.deckMeta));
    app.route(configured.mountPath, configured.router());

    const response = await app.request("https://slides.example/slides/deck1");
    const html = await response.text();
    const meta = await (
      await app.request("https://slides.example/slides/deck1/meta")
    ).json<{
      imagePath: string;
      paths: { ogImage: string };
    }>();

    expect(html).toContain('<meta property="og:title" content="Deck One" />');
    expect(html).toContain('<meta property="og:url" content="https://slides.example/slides/deck1" />');
    expect(html).toContain('<meta property="og:image" content="https://slides.example/slides/deck1/og.png" />');
    expect(html).toContain('<meta property="og:image:width" content="1200" />');
    expect(html).toContain('<meta property="og:image:height" content="630" />');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
    expect(html).toContain('content="Share &lt;this&gt; &amp; &quot;that&quot;"');
    expect(meta.imagePath).toBe("/slides/deck1/og.png");
    expect(meta.paths.ogImage).toBe("/slides/deck1/og.png");
  });

  it("keeps social metadata opt-in and accepts a custom image resolver", async () => {
    const disabled = new Hono();
    disabled.route("/slides", decksRouter({ source: manifestDeckSource({ decks: [deck] }) }));
    expect(await (await disabled.request("https://slides.example/slides/deck1")).text()).not.toContain("og:image");

    const custom = new Hono();
    custom.route(
      "/slides",
      decksRouter({
        source: manifestDeckSource({ decks: [deck] }),
        viewer: { openGraph: { imagePath: ({ deck: current }) => `/social/${current.slug}.png` } },
      }),
    );
    expect(await (await custom.request("https://slides.example/slides/deck1")).text()).toContain(
      '<meta property="og:image" content="https://slides.example/social/deck1.png" />',
    );
  });

  it("returns null controls parts when viewer controls are disabled", async () => {
    const parts = await createDeckViewerParts({
      deck,
      mountPath: "/slides",
      controls: false,
    });

    expect(parts.controls).toBeNull();
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
    expect(first.embedHtml).toMatch(
      /:where\(\[data-hono-decks-viewer\]\[data-hono-decks-embed\] \.hono-decks-viewer-controls\)\{[^}]*z-index:4/,
    );
    expect(html).toContain(
      ":where([data-hono-decks-viewer][data-hono-decks-embed] *:focus-visible){outline:2px solid currentColor;outline-offset:2px}",
    );
    expect(html).toContain("data-hono-decks-viewer-runtime");
    expect(html).toContain('root.querySelectorAll("[data-hono-decks-viewer-link]")');
    expect(html).toContain('link.setAttribute("href", viewerUrl.href)');
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
    expect(second.embedHtml).not.toContain('data-hono-decks-toc-panel="true"');
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
      await app.request("/slides/deck1", undefined, {
        LOCALE: "en-GB",
        TENANT: "docs",
        NONCE: "request-nonce",
      })
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
              children: [jsx("header", { children: meta.title }), toc.content, frame.content, controls?.content],
            }),
        },
      }),
    );

    const html = await (await app.request("/slides/deck1")).text();

    expect(html).toContain('data-custom-viewer="Deck One"');
    expect(html).toContain('data-slide-count="1"');
    expect(html).toContain("data-hono-decks-frame");
    expect(html).toContain("data-hono-decks-toc");
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
    expect(html.indexOf('data-action="next"')).toBeLessThan(html.indexOf("data-slide-position"));
    expect(html.indexOf("data-slide-position")).toBeLessThan(html.indexOf('data-action="previous"'));
    expect(html.indexOf('data-action="previous"')).toBeLessThan(html.indexOf("data-hono-decks-back-link"));
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
                href: `${context.meta.paths.viewer}/about`,
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
    expect(html.indexOf('data-extra="home"')).toBeLessThan(html.indexOf("data-hono-decks-back-link"));
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
    expect(html).toContain("data-slide-position");
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
    expect(html).toContain('class="hono-decks-progress custom-control-item custom-position-item"');
    expect(html).toContain('href="/library?deck=deck1&amp;name=&lt;Deck One&gt;"');
    expect(html).toContain(">Library &lt;Home&gt;</a>");
    expect(html).toContain('data-custom-control="home"');
    expect(html).toContain('data-position-control="&lt;position&gt;"');
    expect(html).toContain("data-slide-position");
    expect(html).toContain("aria-current");
    expect(html).not.toContain("data-hidden");
    expect(html).not.toContain("data-hono-decks-back-link");
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
                icon: "external-link",
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
    expect(html).toContain('aria-label="Safe"');
    expect(html).toContain('title="Safe"');
    expect(html).toContain('d="M15 3h6v6"');
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
            {
              ...defaults.back,
              attributes: { href: "/wrong", "data-hono-decks-back-link": false },
            },
            { ...defaults.previous, attributes: { type: "submit", "data-action": "next" } },
            { ...defaults.position, attributes: { "data-slide-position": false } },
            { ...defaults.next, attributes: { "data-action": "previous" } },
            { ...defaults.fullscreen, attributes: { "data-action": "next" } },
            {
              ...defaults.exportPdf,
              attributes: {
                href: "/wrong.pdf",
                download: "wrong.pdf",
                "data-hono-decks-export": "png",
              },
            },
            {
              ...defaults.exportPng,
              attributes: {
                href: "/wrong.png",
                download: "wrong.png",
                "data-hono-decks-export": "pdf",
              },
            },
          ];
        },
      },
    });
    const html = parts.controls?.html ?? "";

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

  it("builds controls HTML from the same configured viewer control items", async () => {
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
                return jsx("span", {
                  "data-html-render-item": item.label,
                  children: renderDefault(),
                });
              }
              return renderDefault();
            },
          },
        },
      }),
      (c) => c.html(`<article>${c.var.deckViewer.controls?.html}</article>`),
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
    expect(html).not.toContain("data-hono-decks-back-link");
  });

  it("reflects export paths in controls HTML only when provided", async () => {
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

    expect(withoutExports.controls?.html).not.toContain('data-hono-decks-export="pdf"');
    expect(withoutExports.controls?.html).not.toContain('data-hono-decks-export="png"');
    expect(withoutExports.controls?.html).toContain("data-slide-position");
    const exportedHtml = withExports.controls?.html ?? "";
    expect(exportedHtml).toContain('href="/slides/deck1/export.png"');
    expect(exportedHtml).toContain('data-hono-decks-export="png"');
    expect(exportedHtml).toContain('href="/slides/deck1/export.pdf"');
    expect(exportedHtml).toContain('data-hono-decks-export="pdf"');
    expect(exportedHtml.indexOf('data-hono-decks-export="png"')).toBeLessThan(
      exportedHtml.indexOf("data-slide-position"),
    );
  });

  it("omits the unavailable default print item while preserving explicit custom links", async () => {
    const parts = await createDeckViewerParts({
      deck,
      mountPath: "/slides",
      availablePages: { print: false },
      controls: {
        items: (defaults, context) => [
          defaults.print,
          { type: "link", href: context.meta.paths.print, label: "Custom print" },
        ],
      },
    });

    expect(parts.meta.availablePages.print).toBe(false);
    expect(parts.controls?.html).not.toContain('data-hono-decks-print="true"');
    expect(parts.controls?.html).toContain('href="/slides/deck1/print"');
    expect(parts.controls?.html).toContain("Custom print");
  });
});
