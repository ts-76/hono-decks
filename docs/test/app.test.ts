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
    ["/docs/getting-started", "最初のデッキを作ってコンパイルする"],
    ["/docs/authoring", "1つのデッキを1つのディレクトリに置く"],
    ["/docs/configuration", "共有configの責任範囲を確認する"],
    ["/docs/routing", "configのmountPathをすべての画面の起点にする"],
    ["/docs/security", "最初は公開する画面を絞る"],
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

    expect(ja).toContain("hono-decks.config.ts");
    expect(ja).toContain("build.ogpCacheFile");
    expect(ja).toContain("defineDecksConfig");
    expect(ja).toContain("decks.router(overrides)");
    expect(ja).toContain('href="/api?lang=ja#define-decks-config"');
    expect(en).toContain("Understand the shared config");
    expect(en).toContain("Generated defaults, app config");
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
    expect(html).toContain('id="deck"');
    expect(html).toContain("decks/welcome/deck.mdx");
    expect(html).toContain("src/generated/");
    expect(html).toContain("bun run dev");
    expect(html).toContain("http://localhost:3000/decks");
    expect(html).toContain('id="troubleshooting"');
    expect(html).toContain('href="/docs/authoring?lang=ja"');
  });

  it("renders anchored API definitions with imports, signatures, guide links, and source links", async () => {
    const html = await (await app.request("/api")).text();

    expect(html).toContain('id="configured-decks"');
    expect(html).toContain('id="deck-document-options"');
    expect(html).toContain('id="compile-decks"');
    expect(html).toContain("import type { ConfiguredDecks }");
    expect(html).toContain("interface ConfiguredDecks");
    expect(html).toContain("packages/decks/src/server/define-decks.ts");
    expect(html).toContain("使う場面");
    expect(html).toContain("generated workflowを使わず独自pipelineを作るとき");
    expect(html).toContain("通常は生成されたcreateDecks(config)から始める");
    expect(html).toContain('class="copy-button"');
    expect(html).not.toContain("<table>");
  });

  it("guides first-time users from basic tasks to optional extensions", async () => {
    const authoring = await (await app.request("/docs/authoring")).text();
    const configuration = await (await app.request("/docs/configuration")).text();
    const routing = await (await app.request("/docs/routing")).text();
    const security = await (await app.request("/docs/security")).text();

    expect(authoring).toContain("まずサーバーコンポーネントを使う");
    expect(authoring).toContain("ブラウザ操作が必要な場合だけIslandにする");
    expect(configuration).toContain("build input、公開path、runtime policy");
    expect(routing).toContain("はビューアー内部のiframe用");
    expect(security).toContain('languageDetector');
    expect(security).toContain("同じnonceをCSPヘッダーとHTMLへ渡す");
    expect(security).toContain("許可していないオリジンでは拒否される");
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
