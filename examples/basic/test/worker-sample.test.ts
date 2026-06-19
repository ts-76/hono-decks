import { describe, expect, it } from "vitest";
import { Badge } from "../decks/sample/components";
import { decks, decksRouter } from "../src/generated/decks";

async function sampleApp() {
  return (await import("../src/index")).default;
}

describe("sample Worker app", () => {
  it("uses a generated module-backed deck source", async () => {
    const entries = await decks.source.listDecks({} as never);

    expect(entries).toHaveLength(3);
    expect(entries[0]).toMatchObject({
      slug: "code",
      sourcePath: "decks/code/deck.mdx",
    });
    expect(entries[1]).toMatchObject({
      slug: "media",
      sourcePath: "decks/media/deck.mdx",
    });
    expect(entries[2]).toMatchObject({
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
    expect(html).toContain("radial-gradient(circle at top,#1e2b5c,#050816 62%)");
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
  });

  it("renders fenced code blocks with language class, escaping, and overflow styles", async () => {
    const app = await sampleApp();
    const response = await app.request("/decks/code/render");

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("<h1>Code verification</h1>");
    expect(html).toContain("<pre><code class=\"language-ts\"");
    expect(html).toContain("const view = &lt;Slide title=&quot;Hello&quot; /&gt;");
    expect(html).toContain("return items.map((item) =&gt; item.id).join(&quot;, &quot;)");
    expect(html).toContain(".slide pre{max-width:100%;overflow:auto");
    expect(html).toContain(".slide code{font-family:");
  });

  it("serves generated local assets for the media deck", async () => {
    const app = await sampleApp();
    const response = await app.request("/decks/media/assets/local-jsx.svg");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/svg+xml");
    expect(response.headers.get("cache-control")).toBe("public, max-age=300");
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
    expect(js).toMatch(/Counter__sample_[a-z0-9]+/);
    expect(js).toContain("useState");
    expect(js).toContain("data-sample-counter-button");
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
