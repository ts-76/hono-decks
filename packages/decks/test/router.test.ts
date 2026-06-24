import { Hono } from "hono";
import { jsx } from "hono/jsx/jsx-runtime";
import { describe, expect, it } from "vitest";
import type { CompiledDeck } from "../src/deck/model";
import { defineDecks, defineDecksConfig } from "../src/server/define-decks";
import { manifestDeckSource } from "../src/source/manifest-source";
import { withR2Assets } from "../src/source/r2-assets";
import { createDeckViewerParts, deckContext, decksRouter } from "../src/server/router";
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
    expect(html).toContain(".hono-decks-viewport{width:min(100vw,calc(100vh * 16 / 9));aspect-ratio:16/9");
    expect(html).toContain(".hono-decks-viewport:focus-visible");
    expect(html).toContain(".hono-decks-frame-stage{width:100%;height:100%");
    expect(html).toContain(".hono-decks-frame-stage iframe{width:100%;height:100%");
    expect(html).not.toContain(".hono-decks-frame-stage iframe{width:100%;height:100%;border:0;display:block;background:");
    expect(html).toContain("@media (prefers-reduced-motion: reduce)");
    expect(html).not.toContain('width="1920"');
    expect(html).not.toContain('height="1080"');
    expect(html).not.toContain("DESIGN_WIDTH");
    expect(html).not.toContain("stage.style.transform");
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('data-action="previous"');
    expect(html).toContain('data-action="next"');
    expect(html).toContain('data-action="fullscreen"');
    expect(html).toContain('href="/slides"');
    expect(html).toContain('data-hono-decks-back-link');
    expect(html).toContain("message.stepCount");
    expect(html).toContain("root?.setAttribute(\"data-step-index\", String(message.stepIndex ?? 0))");
    expect(html).toContain("root?.setAttribute(\"data-step-count\", String(message.stepCount ?? 0))");
    expect(html).not.toContain('String(message.stepIndex) + " / " + String(message.stepCount)');
    expect(html).toContain("pointerdown");
    expect(html).toContain("pointerup");
    expect(html).toContain("touch-action:pan-y");
    expect(html).toContain('document.querySelectorAll("[data-action=\'previous\']")');
    expect(html).toContain('document.querySelectorAll("[data-action=\'next\']")');
    expect(html).toContain('document.querySelectorAll("[data-action=\'fullscreen\']")');
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

  it("returns null controls parts when viewer controls are disabled", async () => {
    const parts = await createDeckViewerParts({
      deck,
      mountPath: "/slides",
      controls: false,
    });

    expect(parts.controls).toBeNull();
    expect(parts.controlsHtml).toBeNull();
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
  });
});
