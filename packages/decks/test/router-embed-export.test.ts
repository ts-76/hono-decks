import { Hono } from "hono";
import { jsx } from "hono/jsx/jsx-runtime";
import { describe, expect, it } from "vite-plus/test";
import { manifestDeckSource } from "../src/source/manifest-source";
import { decksRouter } from "../src/server/router";
import { deck } from "./support/router-fixtures";

describe("decksRouter external embeds and browser export", () => {
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
        "x-frame-ancestors": "https://blog.example.com, https://notes.example.net/article javascript:alert(1)",
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
    for (const tag of html.match(/<(?:style|script)\b[^>]*>/gi) ?? []) {
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

    const enabled = await withEmbed.request("/slides/deck1/embed", {
      headers: { "x-embed-enabled": "1" },
    });
    expect(enabled.status).toBe(200);
    expect(enabled.headers.get("content-security-policy")).toBe("frame-ancestors 'self'");
    const html = await enabled.text();
    expect(html).toContain(".hono-decks-embedded-viewer{width:100%;height:100%;min-height:0;overflow:hidden}");
    expect(html).toContain(
      ".hono-decks-embedded-viewer .hono-decks-viewer-shell{position:relative;height:100%;grid-template-rows:minmax(0,1fr);overflow:hidden}",
    );
    expect(html).toContain('data-hono-decks-viewer-link="true"');
    expect(html).toContain('aria-label="Open full viewer in new tab"');
    expect(html).toContain('href="/slides/deck1"');
    expect(html).not.toContain('data-action="previous"');
    expect(html).not.toContain('data-action="next"');
    expect(html).not.toContain('data-action="fullscreen"');
    expect(html).not.toContain('data-hono-decks-print="true"');
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
          authorize: () => true,
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
          authorize: ({ c }) => c.req.header("x-owner") === "yes",
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
    expect(unauthorizedViewer).toContain("data-slide-position");
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
          authorize: ({ c, deck, format }) => {
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
});
