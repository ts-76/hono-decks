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
    expect(html).toContain("ルートと画面");
    expect(html).toContain("セキュリティ");
    expect(html).toContain("このページと同じHonoXアプリに、MDXから生成したデッキを組み込んでいます。");
    expect(html).toContain("パッケージを追加して、デッキを生成する");
    expect(html).not.toContain("既存のHonoアプリへ追加できます");
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
    ["/docs/authoring", "デッキごとにディレクトリを分ける"],
    ["/docs/configuration", "設定ファイルごとの役割を確認する"],
    ["/docs/routing", "mountPathをすべてのルートの起点にする"],
    ["/docs/security", "公開する画面を必要なものに絞る"],
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

  it("documents config ownership, build recipes, runtime resolvers, and override precedence in both languages", async () => {
    const ja = await (await app.request("/docs/configuration")).text();
    const en = await (await app.request("/docs/configuration?lang=en")).text();

    expect(ja).toContain("hono-decks.config.ts");
    expect(ja).toContain("build.ogpCacheFile");
    expect(ja).toContain('id="browser-export"');
    expect(ja).toContain("Browser RunでPDF / PNGを書き出す");
    expect(ja).toContain("DeckBrowserRunBinding");
    expect(ja).toContain("deckExportAllowed");
    expect(ja).toContain("2026-03-24");
    expect(ja).toContain("/:slug/export.pdf");
    expect(ja).toContain("公開範囲を明示する");
    expect(ja).toContain("出力を全員に許可する場合");
    expect(ja).toContain("authorize: () =&gt; true");
    expect(ja).toContain("<code>authorize</code>を省略した場合も公開されます");
    expect(ja).toContain("defineDecksConfig");
    expect(ja).toContain("wrangler dev");
    expect(ja).toContain("明示したbooleanまたは関数は自動判定より優先");
    expect(ja).toContain("判定できない環境では本番モード");
    expect(ja).toContain("decks.router(overrides)");
    expect(ja).toContain('href="/api?lang=ja#define-decks-config"');
    expect(en).toContain("Understand the shared config");
    expect(en).toContain("Export PDF and PNG with Browser Run");
    expect(en).toContain("Use a remote binding during local development");
    expect(en).toContain("Make export access explicit");
    expect(en).toContain("Omitting <code>authorize</code> also makes exports public");
    expect(en).toContain("Generated defaults, app config");
    expect(en).toContain("An explicit boolean or resolver overrides detection");
    expect(en).toContain("unknown environments fail closed to production mode");
  });

  it("uses concise Japanese instead of internal architecture jargon", async () => {
    const paths = ["/", "/docs/getting-started", "/docs/authoring", "/docs/configuration", "/docs/routing", "/docs/security", "/api"];

    for (const path of paths) {
      const html = await (await app.request(path)).text();
      expect(html).not.toContain("request-aware");
      expect(html).not.toContain("route surface");
      expect(html).not.toContain("次の一手");
      expect(html).not.toContain("CLIとruntime");
      expect(html).not.toContain("共有config");
      expect(html).not.toContain("custom build");
      expect(html).not.toContain("exampleを見る");
      expect(html).not.toContain("export request");
    }
  });

  it("documents the complete first-run success and recovery path", async () => {
    const html = await (await app.request("/docs/getting-started")).text();

    expect(html).toContain('id="prerequisites"');
    expect(html).toContain("インストールから表示確認まで");
    expect(html).toContain('id="install"');
    expect(html).toContain('id="deck"');
    expect(html).toContain("decks/welcome/deck.mdx");
    expect(html).toContain("src/generated/");
    expect(html).toContain("npm run dev");
    expect(html).toContain("npm install hono-decks");
    expect(html).toContain("pnpm add hono-decks");
    expect(html).toContain("yarn add hono-decks");
    expect(html).toContain("bun add hono-decks");
    expect(html).not.toContain("Bun 1.2以降");
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
    expect(html).toContain("生成コードを使わず、デッキの取得からルーティングまでを独自に組み立てるとき");
    expect(html).toContain("まずcreateDecks(config)から始める");
    expect(html).toContain('class="copy-button"');
    expect(html).not.toContain("<table>");
  });

  it("guides first-time users from basic tasks to optional extensions", async () => {
    const authoring = await (await app.request("/docs/authoring")).text();
    const configuration = await (await app.request("/docs/configuration")).text();
    const routing = await (await app.request("/docs/routing")).text();
    const security = await (await app.request("/docs/security")).text();

    expect(authoring).toContain("まずサーバーコンポーネントを使う");
    expect(authoring).toContain("ブラウザ操作が必要な部品だけをIslandにする");
    expect(configuration).toContain("ビルド対象、公開パス、実行時の挙動");
    expect(routing).toContain("はビューアー内のiframeが読み込むURL");
    expect(security).toContain('languageDetector');
    expect(security).toContain("同じnonceをCSPヘッダーとHTMLへ渡す");
    expect(security).toContain("許可していないオリジンでは拒否される");
  });

  it("documents the supported authoring syntax and its default boundaries", async () => {
    const ja = await (await app.request("/docs/authoring")).text();
    const en = await (await app.request("/docs/authoring?lang=en")).text();

    expect(ja).toContain('id="syntax"');
    expect(ja).toContain('id="notes"');
    expect(ja).toContain("本文はGFMとMDXで書く");
    expect(ja).toContain("GFM（テーブル、タスクリスト、打ち消し線、自動リンク）を使えます");
    expect(ja).not.toContain("追加設定なしで");
    expect(ja).toContain("&lt;Fire&gt;");
    expect(ja).toContain(":::fire");
    expect(ja).toContain('each=&quot;item&quot;');
    expect(ja).toContain('fire=&quot;scale&quot;');
    expect(ja).toContain('effect=&quot;blur-in&quot;');
    expect(ja).toContain("複数のJSX要素を同時に表示するときは");
    expect(ja).toContain('data-fire-effect=&quot;blur-in&quot;');
    expect(ja).toContain("--fire-filter");
    expect(ja).toContain("https://sli.dev/guide/animations");
    expect(ja).toContain("Slidevの");
    expect(ja).toContain("一部インスパイアされています");
    expect(ja).toContain("互換性を保証するものではありません");
    expect(ja).toContain("at");
    expect(ja).toContain("depth");
    expect(ja).toContain("every");
    expect(ja).not.toContain("--hono-decks-fire-");
    expect(ja).not.toContain("$fire");
    expect(ja).not.toContain("fragments: list");
    expect(ja).toContain("@[x]");
    expect(ja).toContain("@[embed]");
    expect(ja).toContain("@[iframe]");
    expect(ja).toContain("通常のコードコメントとして書いたMDXコメントもノートとして扱われます");
    expect(ja).toContain("view-transition");
    expect(en).toContain("Write slide content with GFM and MDX");
    expect(en).toContain("Use CommonMark plus GFM tables, task lists, strikethrough, and autolinks");
    expect(en).not.toContain("without extra configuration");
    expect(en).toContain("Fire content one step at a time");
    expect(en).toContain("partly inspired by Slidev");
    expect(en).toContain("not guaranteed to be compatible with Slidev");
    expect(en).toContain("to group multiple JSX elements into one step");
    expect(en).toContain("Any MDX comment is treated as a note");
  });

  it("renders language-aware syntax highlighting while preserving copy controls", async () => {
    const gettingStarted = await (await app.request("/docs/getting-started")).text();
    const authoring = await (await app.request("/docs/authoring")).text();

    expect(gettingStarted).toContain('class="language-bash"');
    expect(gettingStarted).toContain('class="language-jsonc"');
    expect(authoring).toContain('class="language-mdx"');
    expect(authoring).toContain('class="language-tsx"');
    expect(authoring).toMatch(/<span style="color:#[A-Fa-f0-9]{6}/);
    expect(authoring).toContain('class="copy-button"');
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
