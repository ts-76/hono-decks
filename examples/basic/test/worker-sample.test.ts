import { describe, expect, it } from "vitest";
import { Badge } from "../decks/sample/components";
import { decks, decksRouter } from "../src/generated/decks";

async function sampleApp() {
  return (await import("../src/index")).default;
}

describe("sample Worker app", () => {
  it("uses a generated module-backed deck source", async () => {
    const entries = await decks.source.listDecks({} as never);

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
    expect(typeof decks.router).toBe("function");
  });

  it("exports slide components from the sample deck directory", () => {
    expect(typeof Badge).toBe("function");
    expect(typeof decksRouter).toBe("function");
  });

  it("serves a sample home page with the shared layout", async () => {
    const app = await sampleApp();
    const response = await app.request("/");

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("<title>Hono Decks Basic</title>");
    expect(html).toContain('data-sample-layout="home"');
    expect(html).toContain('href="/decks"');
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
    expect(html).toContain("radial-gradient(circle at top, #1e2b5c, #050816 62%)");
    expect(html).toContain('data-action="previous"');
    expect(html).toContain('data-action="next"');
    expect(html).toContain('data-action="fullscreen"');
    expect(html).not.toContain("/decks/sample/edit");
    expect(html).not.toContain("/agent/chat");
    expect(html).not.toContain("/apply");
  });

  it("serves a deck details page through deckContext and the sample layout", async () => {
    const app = await sampleApp();
    const response = await app.request("/decks/sample/about");

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("<title>Hono Slides - Details</title>");
    expect(html).toContain('data-sample-layout="deck-details"');
    expect(html).toContain("decks/sample/deck.mdx");
    expect(html).toContain('href="/decks/sample/render"');
  });

  it("serves an embeddable deck page from shared viewer parts", async () => {
    const app = await sampleApp();
    const response = await app.request("/decks/sample/embed");

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("<title>Hono Slides - Embed</title>");
    expect(html).toContain('data-sample-layout="deck-embed"');
    expect(html).toContain('data-hono-decks-frame');
    expect(html).toContain('src="/decks/sample/render"');
    expect(html).not.toContain('data-action="previous"');
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
    expect(html).toContain('data-hono-decks-deck');
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
    expect(html).toContain('src="/decks/media/assets/local-jsx.svg"');
    expect(html).toContain('alt="Local JSX asset"');
    expect(html).toContain('src="https://example.com/hono-decks-remote.png"');
    expect(html).toContain('alt="Remote image asset"');
    expect(html).not.toContain("./assets/local-jsx.svg");
    expect(html).toContain('class="hono-decks-embed-frame"');
    expect(html).toContain('src="https://www.youtube.com/embed/dQw4w9WgXcQ"');
    expect(html).toContain('title="YouTube embed example"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"');
    expect(html).toContain('allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"');
    expect(html).toContain('href="https://www.youtube.com/embed/dQw4w9WgXcQ"');
    expect(html).toContain('src="https://example.com/embed/status"');
    expect(html).toContain('Open status embed');
    expect(html).toContain('class="hono-decks-social-embed"');
    expect(html).toContain('data-provider="x"');
    expect(html).toContain('cite="https://x.com/honojs/status/123"');
    expect(html).toContain("Script-based SNS embeds stay link-first by default.");
    expect(html).toContain('href="https://x.com/honojs/status/123"');
    expect(html).toContain("Open on X");
    expect(html).not.toContain("platform.twitter.com/widgets.js");
    expect(html).not.toContain("twitter-tweet");
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
    expect(html).toContain('data-transition="fade"');
    expect(html).toContain("data-hono-decks-fragment");
    expect(html).toContain('data-fragment-order="1"');
    expect(html).toContain("The reveal state is owned by the presentation iframe.");
    expect(html).toContain("CSS animation runs before hydration.");
    expect(html).toContain("Client island animation keeps local state.");
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
