import { Hono } from "hono";
import { jsx } from "hono/jsx/jsx-runtime";
import { describe, expect, it } from "vite-plus/test";
import { configureDecks, defineDecksConfig } from "../src/server/define-decks";
import type { DeckContextVariables } from "../src/server/router";
import { deck } from "./support/router-fixtures";

describe("configureDecks runtime API", () => {
  it("creates a router from a generated manifest with configureDecks", async () => {
    const decks = configureDecks({ mountPath: "/decks", manifest: { decks: [deck] } });
    const app = new Hono();

    app.route(decks.mountPath, decks.router());

    const response = await app.request("/decks/deck1/render");
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("<h1>Intro</h1>");
  });

  it("creates one configured kit for routes, context, source, and paths", async () => {
    const configured = configureDecks(
      { mountPath: "/slides/", decks: [deck] },
      { pages: { index: false, print: false } },
    );
    const app = new Hono<{ Variables: DeckContextVariables }>();
    app.get(`${configured.mountPath}/:slug/about`, configured.context(), (c) =>
      c.json({
        paths: c.var.deckMeta.paths,
        availablePages: c.var.deckMeta.availablePages,
        controlsHtml: c.var.deckViewer.controls?.html,
      }),
    );
    app.route(configured.mountPath, configured.router());

    expect(configured.mountPath).toBe("/slides");
    expect(configured.paths("deck 1")).toMatchObject({
      viewer: "/slides/deck%201",
      presentation: "/slides/deck%201/presentation",
      embed: "/slides/deck%201/embed",
      ogImage: "/slides/deck%201/og.png",
      assets: "/slides/deck%201/assets",
    });
    expect((await app.request("/slides")).status).toBe(404);
    expect((await app.request("/slides/deck1/render")).status).toBe(200);
    const about = await (
      await app.request("/slides/deck1/about")
    ).json<{
      paths: { viewer: string; print: string };
      availablePages: { print: boolean };
      controlsHtml: string;
    }>();
    expect(about.paths).toMatchObject({ viewer: "/slides/deck1", print: "/slides/deck1/print" });
    expect(about.availablePages.print).toBe(false);
    expect(about.controlsHtml).not.toContain('data-hono-decks-print="true"');
  });

  it("keeps root-mounted paths canonical", () => {
    const configured = configureDecks({ mountPath: "/", decks: [deck] });
    expect(configured.mountPath).toBe("/");
    expect(configured.paths("deck1").viewer).toBe("/deck1");
  });

  it("deeply composes nested router overrides without dropping unrelated defaults", async () => {
    const decks = configureDecks(
      { mountPath: "/decks", decks: [deck] },
      {
        viewer: {
          lang: "en",
          style: ".base-viewer { color: red; }",
          openGraph: { imagePath: "/base-social.png" },
          controls: {
            className: "base-controls",
            hidden: ["fullscreen"],
            labels: { previous: "Back" },
            before: [{ type: "link", href: "/base", label: "Base" }],
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
      },
    );
    const app = new Hono();
    app.route(
      "/decks",
      decks.router({
        viewer: {
          openGraph: {},
          controls: {
            itemClassName: "override-item",
            hidden: ["print"],
            labels: { next: "Forward" },
            before: [{ type: "link", href: "/override", label: "Override" }],
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
    expect(html).toContain('<meta property="og:image" content="http://localhost/base-social.png" />');
    expect(html).toContain(".base-viewer { color: red; }");
    expect(html).toContain("base-controls");
    expect(html).toContain("override-item");
    expect(html).toContain(">Back</button>");
    expect(html).toContain(">Forward</button>");
    expect(html).toContain('href="/base"');
    expect(html).toContain('href="/override"');
    expect(html).not.toContain('data-action="fullscreen"');
    expect(html).not.toContain("data-hono-decks-print-link");
    expect(html).toContain("speaker-link");
    expect(html).toContain('aria-label="Speaker"');
    expect(html).toContain('<meta name="viewer-override" content="viewer"/>');
    expect(html).toContain('<style nonce="merged-nonce">');
    expect(renderHtml).toContain('<html lang="fr">');
    expect(renderHtml).toContain('<meta name="document-base" content="base"/>');
    expect(renderHtml).toContain('<style data-hono-decks-presentation-style nonce="merged-nonce">');
  });

  it("defines the build-only config without changing the object", () => {
    const config = defineDecksConfig({ mountPath: "/slides", build: { root: "talks" } });
    expect(config).toEqual({ mountPath: "/slides", build: { root: "talks" } });
  });

  it("decorates the generated source through createDecks options", async () => {
    const configured = configureDecks(
      { mountPath: "/slides", decks: [deck, { ...deck, slug: "hidden" }] },
      {
        source: (source) => ({
          listDecks: async (c) => (await source.listDecks(c)).filter((entry) => entry.slug !== "hidden"),
          getCompiledDeck: (c, slug) => (slug === "hidden" ? Promise.resolve(null) : source.getCompiledDeck(c, slug)),
        }),
      },
    );
    const app = new Hono();
    app.route(configured.mountPath, configured.router());
    expect((await app.request("/slides/deck1")).status).toBe(200);
    expect((await app.request("/slides/hidden")).status).toBe(404);
  });

  it("fails loudly when the router is mounted away from the compiled mountPath", async () => {
    const configured = configureDecks({ mountPath: "/slides", decks: [deck] });
    const app = new Hono();
    app.route("/talks", configured.router());
    app.onError((error, c) => c.text(error.message, 500));
    const response = await app.request("/talks/deck1");
    expect(response.status).toBe(500);
    expect(await response.text()).toContain('compiled for mountPath "/slides"');
  });

  it("restores deck transition defaults omitted from generated slide metadata", async () => {
    const configured = configureDecks({
      mountPath: "/slides",
      decks: [
        {
          ...deck,
          meta: { ...deck.meta, transition: "fade" },
          slides: deck.slides.map((slide) => ({ ...slide, meta: { meta: {} } })),
        },
      ],
    });
    const compiled = await configured.source.getCompiledDeck({} as never, "deck1");
    expect(compiled?.slides[0]?.meta.transition).toBe("fade");
  });

  it("keeps the root API focused and exposes low-level APIs from advanced", async () => {
    const mod = await import("../src/mod");
    const advanced = await import("../src/advanced");

    expect("decksRouter" in mod).toBe(false);
    expect("deckContext" in mod).toBe(false);
    expect("createDeckViewerParts" in mod).toBe(false);
    expect(typeof mod.createDeckViewerEmbed).toBe("function");
    expect(typeof mod.createDeckPaths).toBe("function");
    expect(typeof advanced.decksRouter).toBe("function");
    expect(typeof advanced.deckContext).toBe("function");
    expect(typeof advanced.configureDecks).toBe("function");
  });
});
