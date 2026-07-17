import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vite-plus/test";
import { Badge } from "../decks/sample/components";
import { decks } from "../src/decks";

async function sampleApp() {
  return (await import("../src/index")).default;
}

describe("sample Worker app", () => {
  it("blocks indexing and crawling", async () => {
    const app = await sampleApp();
    const home = await app.request("/");
    const robots = await app.request("/robots.txt");

    expect(home.headers.get("x-robots-tag")).toBe("noindex, nofollow, noarchive");
    expect(await robots.text()).toBe("User-agent: *\nDisallow: /\n");
  });

  it("keeps generated deck imports behind a sample facade", async () => {
    const entrySource = await readFile(new URL("../src/index.ts", import.meta.url), "utf8");
    const facadeSource = await readFile(new URL("../src/decks.ts", import.meta.url), "utf8");
    const configSource = await readFile(new URL("../hono-decks.config.ts", import.meta.url), "utf8");
    const packageSource = await readFile(new URL("../package.json", import.meta.url), "utf8");
    const pagesSource = await readFile(new URL("../src/pages.tsx", import.meta.url), "utf8");

    for (const source of [entrySource, configSource, pagesSource]) {
      expect(source).toContain('from "hono-decks"');
      expect(source).not.toContain("hono-decks/runtime");
    }

    expect(entrySource).not.toContain("./generated/decks");
    expect(entrySource).not.toContain("DeckBrowserRunBinding");
    expect(entrySource).not.toContain("pdf: true");
    expect(entrySource).not.toContain("data-sample-control");
    expect(entrySource).not.toContain("renderSampleViewerHead");
    expect(entrySource).toContain("decks.mountPath");
    expect(facadeSource).toContain("./generated/decks");
    expect(facadeSource).toContain('import config from "../hono-decks.config"');
    expect(facadeSource).toContain("export const decks = createDecks(config)");
    expect(configSource).toContain("defineDecksConfig");
    expect(configSource).toContain("defineDecksConfig<DecksConfigEnv>");
    expect(configSource).not.toContain("as DecksConfigBindings");
    expect(configSource).not.toContain("c.env as");
    expect(configSource).toContain('mountPath: "/decks"');
    expect(configSource).toContain('ogpCacheFile: "decks/ogp-cache.json"');
    expect(configSource).toContain("DeckBrowserRunBinding");
    expect(configSource).toContain("DECK_PRESENTER_ENABLED");
    expect(configSource).not.toContain("DECK_RUNTIME_DEV");
    expect(packageSource).not.toContain("DECK_RUNTIME_DEV");
    expect(configSource).toContain("renderSampleViewerHead");
    expect(configSource).toContain("pdf: true");
    expect(configSource).toContain("data-sample-control");
    expect(configSource).toContain("presenter: {");
    expect(configSource).toContain("viewerControl: {");
    expect(configSource).toContain('className: "sample-viewer-controls"');
    expect(configSource).toContain('itemClassName: "sample-viewer-control"');
    expect(configSource).not.toContain('hidden: ["fullscreen"]');
    expect(configSource).toContain('icon: "home"');
    expect(configSource).toContain('icon: "details"');
    expect(configSource).toContain('icon: "presenter"');
    expect(configSource).toContain("before: [");
    expect(configSource).toContain("after: (context)");
  });

  it("uses a generated module-backed deck source", async () => {
    const entries = await decks.source.listDecks({} as never);
    const sampleDeck = await decks.source.getCompiledDeck({} as never, "sample");

    expect(entries).toHaveLength(4);
    expect(entries[0]).toMatchObject({
      slug: "code",
      sourcePath: "decks/code/deck.mdx",
    });
    expect(entries[1]).toMatchObject({
      slug: "media",
      sourcePath: "decks/media/deck.mdx",
    });
    expect(entries[2]).toMatchObject({
      slug: "motion",
      sourcePath: "decks/motion/deck.mdx",
    });
    expect(entries[3]).toMatchObject({
      slug: "sample",
      sourcePath: "decks/sample/deck.mdx",
    });
    expect(sampleDeck?.slides[0]?.notes).toContain("Introduce the clean projection route for talks.");
    expect(sampleDeck?.slides[1]?.notes).toContain("Use the presenter route for notes and next-slide preview.");
    expect(typeof decks.router).toBe("function");
  });

  it("exports slide components from the sample deck directory", () => {
    expect(typeof Badge).toBe("function");
    expect(typeof decks.router).toBe("function");
  });

  it("serves a sample home page with the shared layout", async () => {
    const app = await sampleApp();
    const response = await app.request("/");

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("<title>Hono Decks Basic</title>");
    expect(html).toContain('data-sample-layout="home"');
    expect(html).toContain("color-scheme: dark");
    expect(html).toContain('class="sample-home-hero"');
    expect(html).toContain("Slides belong");
    expect(html).toContain("--sample-accent: #ff6b2c");
    expect(html).toContain('href="/decks"');
    expect(html).toContain('href="/decks/sample/about"');
  });

  it("renders a production-quality deck catalog", async () => {
    const app = await sampleApp();
    const response = await app.request("/decks");

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("<title>Deck Lab — Hono Decks Basic</title>");
    expect(html).toContain('id="basic-deck-index-css"');
    expect(html).toContain('class="deck-index-hero"');
    expect(html).toContain('id="deck-catalog"');
    expect(html).toContain("Four decks.");
    expect(html).toContain("Hono Slides");
    expect(html).toContain("Code Verification");
    expect(html).toContain("Media Verification");
    expect(html).toContain("Motion Verification");
    expect(html).toContain('class="deck-showcase-preview"');
    expect(html).toContain('data-deck-art="sample"');
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("/embed");
    expect(html).toContain('href="/decks/sample/presentation"');
    expect(html).toContain('href="/decks/sample/about"');
  });

  it("serves the sample deck as a public viewer without edit controls", async () => {
    const app = await sampleApp();
    const response = await app.request("/decks/sample");

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("<title>Hono Slides</title>");
    expect(html).toContain('src="/decks/sample/render"');
    expect(html).toContain(".hono-decks-frame-stage iframe{width:100%;height:100%");
    expect(html).not.toContain('width="1920"');
    expect(html).not.toContain('height="1080"');
    expect(html).not.toContain("DESIGN_WIDTH");
    expect(html).not.toContain("stage.style.transform");
    expect(html).toContain('id="hono-css"');
    expect(html).toContain("linear-gradient(145deg, oklch(99% 0 0) 0%, oklch(94% 0 0) 58%, oklch(88% 0 0) 100%)");
    expect(html).toContain("color: #111827");
    expect(html).not.toContain("radial-gradient(circle at top, #1e2b5c, #050816 62%)");
    expect(html).toContain("border-radius: 8px");
    expect(html).toContain("background: #ffffff");
    expect(html).toContain("outline: 3px solid #0369a1");
    expect(html).toContain('href="/"');
    expect(html).toContain('data-sample-control="home"');
    expect(html).toContain('aria-label="Home"');
    expect(html).not.toContain(">Home</a>");
    expect(html).toContain('class="hono-decks-viewer-controls sample-viewer-controls"');
    expect(html).toContain('class="sample-viewer-control"');
    expect(html).toContain("cursor:pointer");
    expect(html).toContain("data-hono-decks-control-icon");
    expect(html).toContain('href="/decks"');
    expect(html).toContain("data-hono-decks-back-link");
    expect(html).toContain('href="/decks/sample/about"');
    expect(html).toContain('data-sample-control="details"');
    expect(html).toContain('aria-label="Details"');
    expect(html).not.toContain(">Details</a>");
    expect(html).toContain('data-action="previous"');
    expect(html).toContain('aria-label="Previous slide"');
    expect(html).not.toContain(">Back</button>");
    expect(html).toContain('data-action="next"');
    expect(html).toContain('aria-label="Next slide"');
    expect(html).not.toContain(">Forward</button>");
    expect(html).toContain('data-action="fullscreen"');
    expect(html).toContain('aria-label="Toggle fullscreen"');
    expect(html).toContain('href="/decks/sample/print"');
    expect(html).toContain('data-hono-decks-print="true"');
    expect(html).toContain('aria-label="Print view"');
    expect(html).toContain('data-viewer-navigation="previous"');
    expect(html).toContain('data-viewer-navigation="next"');
    expect(html).toContain('orientation.lock("landscape")');
    expect(html).not.toContain('href="/decks/sample/presenter"');
    expect(html).not.toContain('data-sample-control="presenter"');
    expect(html.indexOf('data-sample-control="home"')).toBeLessThan(html.indexOf('data-action="previous"'));
    expect(html.indexOf('data-action="next"')).toBeLessThan(html.indexOf('data-sample-control="details"'));
    expect(html).not.toContain('href="/decks/sample/export.pdf"');
    expect(html).not.toContain('data-hono-decks-export="pdf"');
    expect(html).not.toContain('href="/decks/sample/export.png"');
    expect(html).not.toContain('data-hono-decks-export="png"');
    expect(html).not.toContain("/decks/sample/edit");
    expect(html).not.toContain("/agent/chat");
    expect(html).not.toContain("/apply");
  });

  it("serves presentation and presenter routes for the sample deck", async () => {
    const app = await sampleApp();
    const projection = await app.request("/decks/sample/presentation");
    const disabledPresenter = await app.request("/decks/sample/presenter");
    const presenterEnv = { DECK_PRESENTER_ENABLED: "true" };
    const presenterViewer = await app.request("/decks/sample", {}, presenterEnv);
    const presenter = await app.request("/decks/sample/presenter", {}, presenterEnv);

    expect(projection.status).toBe(200);
    const projectionHtml = await projection.text();
    expect(projectionHtml).toContain('data-hono-decks-projection="true"');
    expect(projectionHtml).toContain("data-hono-decks-stage");
    expect(projectionHtml).not.toContain("data-hono-decks-viewer-controls");
    expect(projectionHtml).not.toContain("Introduce the clean projection route for talks.");
    expect(projectionHtml).not.toContain("Use the presenter route for notes and next-slide preview.");

    expect(disabledPresenter.status).toBe(404);

    expect(presenterViewer.status).toBe(200);
    const presenterViewerHtml = await presenterViewer.text();
    expect(presenterViewerHtml).toContain('href="/decks/sample/presenter"');
    expect(presenterViewerHtml).toContain('data-sample-control="presenter"');
    expect(presenterViewerHtml).toContain('aria-label="Presenter"');
    expect(presenterViewerHtml).not.toContain(">Presenter</a>");

    expect(presenter.status).toBe(200);
    const presenterHtml = await presenter.text();
    expect(presenterHtml).toContain("data-hono-decks-presenter");
    expect(presenterHtml).toContain("data-hono-decks-presenter-current");
    expect(presenterHtml).toContain('src="/decks/sample/presentation"');
    expect(presenterHtml).toContain("data-hono-decks-presenter-next");
    expect(presenterHtml).toContain("data-hono-decks-presenter-notes");
    expect(presenterHtml).toContain("Introduce the clean projection route for talks.");
    expect(presenterHtml).toContain("Use the presenter route for notes and next-slide preview.");
  });

  it("rejects Browser Run export routes without the sample export token", async () => {
    const app = await sampleApp();
    const calls: Array<{ action: "pdf" | "screenshot"; input: Record<string, unknown> }> = [];
    const env = {
      BROWSER: {
        async quickAction(action: "pdf" | "screenshot", input: Record<string, unknown>) {
          calls.push({ action, input });
          return new Response(`${action}:${String(input.url)}`);
        },
      },
      DECK_EXPORT_TOKEN: "sample-secret",
    };

    const pdf = await app.request("https://example.com/decks/sample/export.pdf", {}, env);
    const png = await app.request("https://example.com/decks/sample/export.png", {}, env);

    expect(pdf.status).toBe(403);
    expect(png.status).toBe(403);
    expect(calls).toHaveLength(0);
  });

  it("serves Browser Run export routes when the sample binding and export token are available", async () => {
    const app = await sampleApp();
    const calls: Array<{ action: "pdf" | "screenshot"; input: Record<string, unknown> }> = [];
    const env = {
      BROWSER: {
        async quickAction(action: "pdf" | "screenshot", input: Record<string, unknown>) {
          calls.push({ action, input });
          return new Response(`${action}:${String(input.url)}`, {
            headers: { "content-type": action === "pdf" ? "application/pdf" : "image/png" },
          });
        },
      },
      DECK_EXPORT_TOKEN: "sample-secret",
    };

    const headers = { authorization: "Bearer sample-secret" };
    const pdf = await app.request("https://example.com/decks/sample/export.pdf", { headers }, env);
    const png = await app.request("https://example.com/decks/sample/export.png", { headers }, env);

    expect(pdf.status).toBe(200);
    expect(pdf.headers.get("content-type")).toContain("application/pdf");
    expect(pdf.headers.get("content-disposition")).toBe('attachment; filename="Hono-Slides.pdf"');
    expect(await pdf.text()).toBe("pdf:https://example.com/decks/sample/print");

    expect(png.status).toBe(200);
    expect(png.headers.get("content-type")).toContain("image/png");
    expect(png.headers.get("content-disposition")).toBe('attachment; filename="Hono-Slides.png"');
    expect(await png.text()).toBe("screenshot:https://example.com/decks/sample/print");

    expect(calls).toHaveLength(2);
    expect(calls[0]).toMatchObject({
      action: "pdf",
      input: {
        url: "https://example.com/decks/sample/print",
        pdfOptions: { format: "a4", printBackground: true, preferCSSPageSize: true },
      },
    });
    expect(calls[1]).toMatchObject({
      action: "screenshot",
      input: {
        url: "https://example.com/decks/sample/print",
        screenshotOptions: { type: "png", fullPage: true },
      },
    });
  });

  it("serves a deck details page through deckContext and the sample layout", async () => {
    const app = await sampleApp();
    const response = await app.request("/decks/sample/about");

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("<title>Hono Slides - Details</title>");
    expect(html).toContain(
      '<meta name="description" content="Hono + Cloudflare Workersで届ける、アプリと一体化したMDXスライド"/>',
    );
    expect(html).toContain('<meta property="og:title" content="Hono Slides"/>');
    expect(html).toContain(
      '<meta property="og:description" content="Hono + Cloudflare Workersで届ける、アプリと一体化したMDXスライド"/>',
    );
    expect(html).toContain('<meta property="og:url" content="/decks/sample"/>');
    expect(html).toContain('data-sample-layout="deck-details"');
    expect(html).toContain("decks/sample/deck.mdx");
    expect(html).toContain('href="/decks/sample/render"');
  });

  it("serves a minimal external iframe document with a same-origin default policy", async () => {
    const app = await sampleApp();
    const response = await app.request("/decks/sample/embed");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-security-policy")).toBe("frame-ancestors 'self'");
    expect(response.headers.get("x-frame-options")).toBeNull();
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    const html = await response.text();
    expect(html).toContain("<title>Hono Slides</title>");
    expect(html).toContain("data-hono-decks-external-embed-document");
    expect(html).toContain('<meta name="robots" content="noindex"/>');
    expect(html).toContain('id="hono-decks-external-embed-css"');
    expect(html).toContain('class="hono-decks-embedded-viewer sample-external-deck-embed"');
    expect(html).toContain("data-hono-decks-frame");
    expect(html).toContain('src="/decks/sample/render"');
    expect(html).toContain('data-hono-decks-embed="true"');
    expect(html).toContain("data-hono-decks-embed-style");
    expect(html).toContain("data-hono-decks-viewer-runtime");
    expect(html).toContain('data-hono-decks-print-path="/decks/sample/print"');
    expect(html).toContain("for (const root of roots)");
    expect(html).toContain('data-action="fullscreen"');
    expect(html).not.toContain("data-hono-decks-back-link");
    expect(html).not.toContain('data-hono-decks-print="true"');
    expect(html).not.toContain('data-sample-layout="deck-embed"');
    expect(html).not.toContain('class="sample-page-header"');
    expect(html).not.toContain("Embeddable viewer");
    expect(html).not.toContain("transform: scale(.5)");
  });

  it("allows configured blog origins to frame the embed route without enabling CORS", async () => {
    const app = await sampleApp();
    const response = await app.request(
      "/decks/sample/embed",
      {},
      {
        DECK_EMBED_ALLOWED_ORIGINS:
          "https://blog.example.com, https://notes.example.net/article ignored-origin javascript:alert(1)",
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-security-policy")).toBe(
      "frame-ancestors 'self' https://blog.example.com https://notes.example.net",
    );
    expect(response.headers.get("x-frame-options")).toBeNull();
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("renders the sample deck with the built-in Hero instead of a placeholder warning", async () => {
    const app = await sampleApp();
    const response = await app.request("/decks/sample/render");

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('class="mdx-hero');
    expect(html).toContain("<h1>MDX-like components</h1>");
    expect(html).toContain('class="sample-badge"');
    expect(html).toContain("Rendered by a Hono JSX component");
    expect(html).toContain("MDX expression props");
    expect(html).toContain("MDX expression children");
    expect(html).toMatch(/data-hono-decks-island="Counter__sample_[a-z0-9]+"/);
    expect(html).toContain("Interactive count");
    expect(html).toContain('src="/decks/sample/assets/r2-cache.svg"');
    expect(html).not.toContain("/decks/sample//decks/sample/assets");
    expect(html).toContain("data-hono-decks-deck");
    expect(html).toContain("function fitDeck()");
    expect(html).toContain('deck.style.transform = "scale(" + scale + ")"');
    expect(html).toContain('<script type="module" src="/decks/_assets/client.js"></script>');
    expect(html).not.toContain('MDX component "Hero" is rendered as a placeholder.');
    expect(html).not.toContain("mdx-component");
  });

  it("renders media asset examples with local JSX rewrite and remote URLs intact", async () => {
    const app = await sampleApp();
    const response = await app.request("/decks/media/render");

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("<h1>Media verification</h1>");
    expect(html).toContain(".layout-media {");
    expect(html).toContain("background: #07111f;");
    expect(html).not.toContain(".slide{box-sizing:border-box;aspect-ratio:16/9;border:");
    expect(html).not.toContain(".hono-decks-stage{width:100vw;height:100vh;overflow:hidden;background:");
    expect(html).toContain('src="/decks/media/assets/local-jsx.svg"');
    expect(html).toContain('alt="Local JSX asset"');
    expect(html).toContain('src="/decks/media/assets/r2-remote.svg"');
    expect(html).toContain('alt="R2-backed media asset"');
    expect(html).not.toContain("./assets/local-jsx.svg");
    expect(html).toContain('class="hono-decks-embed-frame"');
    expect(html).toContain('src="https://www.youtube.com/embed/dQw4w9WgXcQ"');
    expect(html).toContain('title="YouTube embed example"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"');
    expect(html).toContain('allow="fullscreen; picture-in-picture"');
    expect(html).toContain('href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank" rel="noreferrer"');
    expect(html).not.toContain('href="https://www.youtube.com/embed/dQw4w9WgXcQ"');
    expect(html).toContain('src="https://example.com/embed/status"');
    expect(html).toContain('title="Embedded content"');
    expect(html).toContain("Open embed");
    expect(html).toContain('href="https://example.com/embed/status" target="_blank" rel="noreferrer"');
    expect(html).toContain('href="https://example.com/plain-link"');
    expect(html).toContain(">https://example.com/plain-link</a>");
    expect(html).not.toContain('class="hono-decks-social-embed"');
    expect(html).not.toContain('data-provider="x"');
    expect(html).not.toContain('href="https://x.com/honojs/status/123"');
    expect(html).toContain('class="hono-decks-tweet-embed"');
    expect(html).toContain('data-component="TweetEmbed"');
    expect(html).toContain('class="twitter-tweet"');
    expect(html).toContain(
      'href="https://x.com/honojs/status/1659577874821836801?s=20" target="_blank" rel="noreferrer"',
    );
    expect(html).toContain('src="https://platform.twitter.com/widgets.js"');
    expect(html).toContain('class="hono-decks-link-card"');
    expect(html).toContain('href="https://yusukebe.com/"');
    expect(html).toContain("https://yusukebe.com/");
  });

  it("renders code blocks with build-time Shiki highlighting and overflow styles", async () => {
    const app = await sampleApp();
    const response = await app.request("/decks/code/render");

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("<h1>Code verification</h1>");
    expect(html).toContain('class="hono-decks-code-block"');
    expect(html).toContain('class="hono-decks-code-highlight"');
    expect(html).toContain('<pre class="shiki github-dark"');
    expect(html).toContain('style="color:#F97583">const</span>');
    expect(html).toContain('data-filename="worker.ts"');
    expect(html).toContain('data-highlight="2"');
    expect(html).toContain('<figcaption class="hono-decks-code-caption">worker.ts</figcaption>');
    expect(html).toContain(".slide pre{max-width:100%;overflow:auto");
    expect(html).toContain(".slide code{font-family:");
  });

  it("renders motion examples with CSS animation and client island animation hooks", async () => {
    const app = await sampleApp();
    const response = await app.request("/decks/motion/render");

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("<h1>Motion verification</h1>");
    expect(html).toContain('class="motion-orbit"');
    expect(html).toContain("animation:hono-decks-motion-orbit");
    expect(html).toContain("@keyframes hono-decks-motion-orbit");
    expect(html).toContain("@media (prefers-reduced-motion: reduce)");
    expect(html).toContain('data-transition="slide-left"');
    expect(html).toContain("--hono-decks-slide-transition-duration:420ms");
    expect(html).toContain("--hono-decks-slide-transition-easing:cubic-bezier(.2, 0, 0, 1)");
    expect(html).toContain("data-active-transition");
    expect(html).toContain("data-hono-decks-fire");
    expect(html).not.toContain("data-fire-order");
    expect(html).toContain('data-fire-effect="fade-up"');
    expect(html).toContain('data-fire-effect="scale"');
    expect(html).toContain('data-fire-at="+1"');
    expect(html).toContain("The reveal state is owned by the presentation iframe.");
    expect(html).toContain("Markdown fire blocks use Zenn-style directive syntax.");
    expect(html).toContain("Use at for an absolute or relative reveal position.");
    expect(html).toContain("CSS animation runs before hydration.");
    expect(html).toContain("Nested items can join the sequence.");
    expect(html).toContain("Client island animation keeps local state.");
    expect(html).toContain("Queued navigation");
    expect(html).toContain("Rapid commands during a slide transition");
    expect(html).toContain("let stepIndex = 0");
    expect(html).toContain("stepCount");
    expect(html).toMatch(/data-hono-decks-island="MotionMeter__motion_[a-z0-9]+"/);
    expect(html).toContain("data-motion-meter");
    expect(html).toContain("Animation island");
    expect(html).toContain('<script type="module" src="/decks/_assets/client.js"></script>');
  });

  it("serves generated local assets for the media deck", async () => {
    const app = await sampleApp();
    const response = await app.request("/decks/media/assets/local-jsx.svg");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/svg+xml");
    expect(response.headers.get("cache-control")).toBe("public, max-age=300");
    expect(response.headers.get("x-hono-decks-asset-source")).toBe("embedded");
    expect(await response.text()).toContain("#14b8a6");
  });

  it("serves media deck R2-backed image URLs through the R2 binding", async () => {
    const app = await sampleApp();
    const response = await app.request(
      "/decks/media/assets/r2-remote.svg",
      {},
      {
        DECK_ASSETS: {
          async get(key: string) {
            if (key !== "decks/media/assets/r2-remote.svg") return null;
            return {
              body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90"><rect width="160" height="90" fill="#7c3aed"/></svg>',
              httpMetadata: { contentType: "image/svg+xml" },
            };
          },
        },
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/svg+xml");
    expect(response.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(response.headers.get("x-hono-decks-asset-source")).toBe("r2");
    expect(await response.text()).toContain("#7c3aed");
  });

  it("serves the sample client entry for interactive islands", async () => {
    const app = await sampleApp();
    const response = await app.request("/decks/_assets/client.js");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/javascript");
    expect(response.headers.get("cache-control")).toBe("public, max-age=300");
    const js = await response.text();
    expect(js).toContain('querySelectorAll("[data-hono-decks-island]")');
    expect(js).toContain("function Counter");
    expect(js).toContain("function MotionMeter");
    expect(js).toMatch(/Counter__sample_[a-z0-9]+/);
    expect(js).toMatch(/MotionMeter__motion_[a-z0-9]+/);
    expect(js).toContain("useState");
    expect(js).toContain("data-sample-counter-button");
    expect(js).toContain("data-motion-meter-button");
    expect(js).toContain("onClick");
  });

  it("serves generated local asset URLs from an R2 binding with long-lived cache headers", async () => {
    const app = await sampleApp();
    const response = await app.request(
      "/decks/sample/assets/r2-cache.svg",
      {},
      {
        DECK_ASSETS: {
          async get(key: string) {
            if (key !== "decks/sample/assets/r2-cache.svg") return null;
            return {
              body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90"><rect width="160" height="90" fill="#0ea5e9"/></svg>',
              httpMetadata: { contentType: "image/svg+xml" },
            };
          },
        },
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/svg+xml");
    expect(response.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(response.headers.get("x-hono-decks-asset-source")).toBe("r2");
    expect(await response.text()).toContain("#0ea5e9");
  });

  it("does not expose edit or legacy editing APIs from the sample Worker", async () => {
    const app = await sampleApp();

    expect((await app.request("/decks/sample/edit")).status).toBe(404);
    expect((await app.request("/decks/sample/edit/agent/chat", { method: "POST" })).status).toBe(404);
    expect((await app.request("/decks/sample/edit/apply", { method: "POST" })).status).toBe(404);
    expect((await app.request("/deck")).status).toBe(404);
    expect((await app.request("/api/parse", { method: "POST" })).status).toBe(404);
    expect((await app.request("/api/agent/suggest", { method: "POST" })).status).toBe(404);
  });
});
