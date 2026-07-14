import { describe, expect, it } from "vitest";
import app from "../app/server";

describe("HonoX documentation site", () => {
  it("renders the Japanese home page with localized guide and API navigation", async () => {
    const response = await app.request("/");
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(html).toContain('<html lang="ja">');
    expect(html).toContain("Honoアプリ");
    expect(html).toContain("Node.jsで生成し、");
    expect(html).toContain("Honoで配信する");
    expect(html).toContain('href="/docs/getting-started?lang=ja"');
    expect(html).toContain('src="/demo/product/embed"');
    expect(html).toContain('href="/api?lang=ja"');
    expect(html).toContain("このHonoXアプリでMDXから生成しています。");
  });

  it("uses query, cookie, and Accept-Language detection with Japanese fallback", async () => {
    const query = await app.request("https://docs.example/docs/getting-started?lang=en");
    const queryHtml = await query.text();
    const cookie = await app.request("https://docs.example/docs/getting-started", { headers: { cookie: "language=en" } });
    const header = await app.request("https://docs.example/", { headers: { "accept-language": "en-US,en;q=0.9" } });
    const fallback = await app.request("https://docs.example/", { headers: { "accept-language": "fr-FR" } });

    expect(queryHtml).toContain('<html lang="en">');
    expect(queryHtml).toContain("Check the prerequisites");
    expect(queryHtml).toContain('href="/docs/getting-started?lang=ja"');
    expect(query.headers.get("set-cookie")).toContain("language=en");
    expect(await cookie.text()).toContain("Check the prerequisites");
    expect(await header.text()).toContain("Start in five minutes");
    expect(await fallback.text()).toContain('<html lang="ja">');
  });

  it.each([
    ["/docs/getting-started", "インストールしてスライドを生成する"],
    ["/docs/authoring", "デッキごとにディレクトリを作る"],
    ["/docs/configuration", "生成時と実行時で"],
    ["/docs/routing", "標準で用意されるルート"],
    ["/docs/security", "HTMLの設定を画面間で共有する"],
    ["/api", "実行時API"],
  ])("renders %s from HonoX file routes", async (path, expected) => {
    const response = await app.request(path);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain(expected);
    expect(html).toContain('class="docs-layout"');
    expect(html).toContain('class="mobile-page-nav"');
  });

  it("serves the homepage demo from a compiled hono-decks embed route", async () => {
    const embed = await app.request("/demo/product/embed");
    const embedHtml = await embed.text();
    const render = await app.request("/demo/product/render");
    const renderHtml = await render.text();
    const viewer = await app.request("/demo/product");

    expect(embed.status).toBe(200);
    expect(embed.headers.get("content-security-policy")).toContain("frame-ancestors 'self'");
    expect(embedHtml).toContain("data-hono-decks-external-embed-document");
    expect(embedHtml).toContain('/demo/product/render');
    expect(render.status).toBe(200);
    expect(renderHtml).toContain("MDX slides, served by Hono.");
    expect(viewer.status).toBe(404);
  });

  it("documents config ownership, compile flags, runtime resolvers, and override precedence in both languages", async () => {
    const ja = await (await app.request("/docs/configuration")).text();
    const en = await (await app.request("/docs/configuration?lang=en")).text();

    expect(ja).toContain("decks.config.ts");
    expect(ja).toContain("--ogp-cache");
    expect(ja).toContain("defineDecksConfig");
    expect(ja).toContain("mergeDecksRouterOptions");
    expect(ja).toContain('href="/api?lang=ja#define-decks-config"');
    expect(en).toContain("Split configuration across two timelines");
    expect(en).toContain("generated defaults, app config, then call-site overrides");
  });

  it("uses concise Japanese instead of internal architecture jargon", async () => {
    const paths = ["/", "/docs/getting-started", "/docs/authoring", "/docs/configuration", "/docs/routing", "/docs/security", "/api"];

    for (const path of paths) {
      const html = await (await app.request(path)).text();
      expect(html).not.toContain("request-aware");
      expect(html).not.toContain("route surface");
      expect(html).not.toContain("次の一手");
    }
  });

  it("documents the complete first-run success and recovery path", async () => {
    const html = await (await app.request("/docs/getting-started")).text();

    expect(html).toContain('id="prerequisites"');
    expect(html).toContain('id="install"');
    expect(html).toContain("src/generated/");
    expect(html).toContain("bun run dev");
    expect(html).toContain("http://localhost:3000/decks");
    expect(html).toContain('id="troubleshooting"');
    expect(html).toContain('href="/docs/authoring?lang=ja"');
  });

  it("renders anchored API definitions with imports, signatures, guide links, and source links", async () => {
    const html = await (await app.request("/api")).text();

    expect(html).toContain('id="define-decks"');
    expect(html).toContain('id="deck-document-options"');
    expect(html).toContain('id="compile-decks"');
    expect(html).toContain("import { defineDecks }");
    expect(html).toContain("defineDecks(options: DecksOptions): DefinedDecks");
    expect(html).toContain("packages/decks/src/server/define-decks.ts");
    expect(html).toContain('class="copy-button"');
    expect(html).not.toContain("<table>");
  });

  it("links the Deploy to Cloudflare button to the isolated minimal example", async () => {
    const html = await (await app.request("/")).text();

    expect(html).toContain("https://deploy.workers.cloudflare.com/button");
    expect(html).toContain(
      "https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fts-76%2Fhono-slides%2Ftree%2Fmain%2Fexamples%2Fminimal",
    );
    expect(html).not.toContain('aria-disabled="true"');
    expect(html).not.toContain("サンプル準備中");
  });

  it("uses button-controlled SP navigation without details or summary", async () => {
    const html = await (await app.request("/docs/getting-started")).text();

    expect(html).toContain('src="/app/client.ts"');
    expect(html).toContain('data-copy-status="true"');
    expect(html).toContain('class="disclosure-trigger mobile-menu-trigger"');
    expect(html).toContain('aria-controls="mobile-menu-panel"');
    expect(html).toContain('aria-controls="docs-switcher-panel"');
    expect(html).toContain('aria-controls="mobile-page-nav-panel"');
    expect(html).toContain('data-disclosure-panel="true"');
    expect(html).not.toContain("<details");
    expect(html).not.toContain("<summary");
    expect(html).toContain('aria-current="page"');
  });

  it("redirects the documentation root with locale and returns 404 for unknown guides", async () => {
    const docs = await app.request("/docs?lang=en");
    const missing = await app.request("/docs/unknown");

    expect(docs.status).toBe(302);
    expect(docs.headers.get("location")).toBe("/docs/getting-started?lang=en");
    expect(missing.status).toBe(404);
  });
});
