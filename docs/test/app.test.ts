import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vite-plus/test";
import app from "../app/server";
import { locales, messages } from "../app/i18n";
import { clientEntrySource } from "../app/routes/_renderer";

describe("HonoX documentation site", () => {
  it("keeps every locale catalog aligned with the English source keys", () => {
    const sourceKeys = Object.keys(messages.en).sort();

    for (const locale of locales) expect(Object.keys(messages[locale]).sort()).toEqual(sourceKeys);
  });

  it("allows indexing and crawling", async () => {
    const home = await app.request("/");
    const robots = await app.request("/robots.txt");

    expect(home.headers.get("x-robots-tag")).toBeNull();
    expect(robots.headers.get("x-robots-tag")).toBeNull();
    expect(await robots.text()).toBe("User-agent: *\nAllow: /\n");
  });

  it("keeps the home hero within narrow viewports", async () => {
    const css = await readFile(new URL("../app/style.css", import.meta.url), "utf8");

    expect(css).toContain("grid-template-columns: minmax(0, 1fr)");
    expect(css).toContain("max-width: 100%");
    expect(css).toContain("overflow-wrap: anywhere");
    expect(css).toContain("word-break: normal");
    expect(css).not.toContain("word-break: keep-all");
  });

  it("loads the global client entry even when a page has no islands", async () => {
    const html = await (await app.request("/docs/getting-started")).text();

    expect(clientEntrySource(false)).toBe("/app/client.ts");
    expect(html).toContain('<script type="module" src="/app/client.ts"></script>');
  });

  it("publishes the Hono Decks icon metadata and header mark", async () => {
    const html = await (await app.request("/")).text();

    expect(html).toContain('href="/favicon.ico"');
    expect(html).toContain('href="/favicon-32.png"');
    expect(html).toContain('href="/apple-touch-icon.png"');
    expect(html).toContain('href="/site.webmanifest"');
    expect(html).toContain('class="brand-mark" src="/icon-192.png"');
  });

  it("renders the Japanese home page with localized guide and API navigation", async () => {
    const response = await app.request("/?lang=ja");
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(html).toContain('<html lang="ja">');
    expect(html).toContain("Honoアプリ");
    expect(html).toContain("MDXをHono JSXへコンパイルし");
    expect(html).toContain("閲覧・発表・発表者・印刷の各画面を既存のHonoアプリに追加します");
    expect(html).toContain('href="/docs/getting-started?lang=ja"');
    expect(html).toContain('src="/demo/product/embed"');
    expect(html).toContain('href="/demo/product"');
    expect(html).toContain('href="/api?lang=ja"');
    expect(html).toContain("ルートと画面");
    expect(html).toContain("セキュリティ");
    expect(html).toContain("MDXから生成したデッキを、このページと同じHonoXアプリに組み込んでいます。");
    expect(html).toContain("コンパイル後にルーターを登録する");
    expect(html).toContain("Node.jsが必要なのはコンパイル時だけです");
    expect(html).toContain("標準では、外部埋め込みを除くすべての画面が作成されます");
    expect(html).not.toContain("既存のHonoアプリへ追加できます");
  });

  it("uses query, cookie, and Accept-Language detection with English fallback", async () => {
    const query = await app.request("https://docs.example/docs/getting-started?lang=en");
    const queryHtml = await query.text();
    const cookie = await app.request("https://docs.example/docs/getting-started", {
      headers: { cookie: "language=en" },
    });
    const header = await app.request("https://docs.example/", {
      headers: { "accept-language": "en-US,en;q=0.9" },
    });
    const fallback = await app.request("https://docs.example/", {
      headers: { "accept-language": "fr-FR" },
    });
    const noPreference = await app.request("https://docs.example/");

    expect(queryHtml).toContain('<html lang="en">');
    expect(queryHtml).toContain("Start with a working Hono 4 app");
    expect(queryHtml).toContain('href="/docs/getting-started?lang=ja"');
    expect(query.headers.get("set-cookie")).toContain("language=en");
    expect(await cookie.text()).toContain("Start with a working Hono 4 app");
    expect(await header.text()).toContain("Get started");
    expect(await fallback.text()).toContain('<html lang="en">');
    expect(await noPreference.text()).toContain('<html lang="en">');
  });

  it.each([
    ["/docs/getting-started", "最初のデッキを作ってコンパイルする"],
    ["/docs/authoring", "デッキごとにディレクトリを分ける"],
    ["/docs/configuration", "4つのファイルの役割を把握する"],
    ["/docs/recipes", "SatoriでOGP画像をビルド時に保存する"],
    ["/docs/routing", "mountPathをすべてのルートの起点にする"],
    ["/docs/security", "標準で作成されるルートを確認する"],
    ["/api", "実行時API"],
  ])("renders %s from HonoX file routes", async (path, expected) => {
    const response = await app.request(`${path}?lang=ja`);
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
    expect(embedHtml).toContain("/demo/product/render");
    expect(embedHtml).toContain('href="/demo/product"');
    expect(embedHtml).toContain('data-hono-decks-viewer-link="true"');
    expect(embedHtml).toContain('aria-label="Open full viewer in new tab"');
    expect(embedHtml).toContain('d="M15 3h6v6"');
    expect(render.status).toBe(200);
    expect(renderHtml).toContain("MDX slides, served by Hono.");
    expect(viewer.status).toBe(200);
    expect(await viewer.text()).toContain('data-hono-decks-navigation-control="fullscreen"');
  });

  it("separates shared configuration from optional build and export recipes", async () => {
    const ja = await (await app.request("/docs/configuration?lang=ja")).text();
    const en = await (await app.request("/docs/configuration?lang=en")).text();
    const recipesJa = await (await app.request("/docs/recipes?lang=ja")).text();
    const recipesEn = await (await app.request("/docs/recipes?lang=en")).text();

    expect(ja).toContain("hono-decks.config.ts");
    expect(ja).toContain("build.ogpCacheFile");
    expect(ja).not.toContain('id="browser-export"');
    expect(ja).toContain('href="/docs/recipes?lang=ja"');
    expect(ja).toContain("defineDecksConfig");
    expect(ja).toContain("wrangler dev");
    expect(ja).toContain("boolean値または関数を明示すると自動判定より優先");
    expect(ja).toContain("環境を判定できない場合は、安全側に倒して本番モード");
    expect(ja).toContain("decks.router(overrides)");
    expect(ja).toContain('href="/api?lang=ja#define-decks-config"');
    expect(en).toContain("Know which file owns each setting");
    expect(en).toContain("Generated defaults, app config");
    expect(en).toContain("An explicit boolean or resolver takes precedence");
    expect(en).toContain("defaults safely to production mode");
    expect(recipesJa).toContain('id="browser-export"');
    expect(recipesJa).toContain("Browser RunでPDF / PNGを書き出す");
    expect(recipesJa).toContain("DeckBrowserRunBinding");
    expect(recipesJa).toContain("deckExportAllowed");
    expect(recipesJa).toContain("2026-03-24");
    expect(recipesJa).toContain("/:slug/export.pdf");
    expect(recipesJa).toContain("authorizeはPDF・PNG出力だけを制御します");
    expect(recipesJa).toContain("ビューアー、発表画面、発表者画面");
    expect(recipesJa).toContain("authorize: () =&gt; true");
    expect(recipesJa).toContain("誰でもファイルを書き出せます");
    expect(recipesEn).toContain("Export PDF and PNG with Browser Run");
    expect(recipesEn).toContain("Use a remote binding during local development");
    expect(recipesEn).toContain("authorize only controls PDF and PNG export");
    expect(recipesEn).toContain("It does not protect the viewer, presentation, presenter");
  });

  it("uses concise Japanese instead of internal architecture jargon", async () => {
    const paths = [
      "/",
      "/docs/getting-started",
      "/docs/authoring",
      "/docs/configuration",
      "/docs/recipes",
      "/docs/routing",
      "/docs/security",
      "/api",
    ];

    for (const path of paths) {
      const html = await (await app.request(`${path}?lang=ja`)).text();
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
    const html = await (await app.request("/docs/getting-started?lang=ja")).text();

    expect(html).toContain('id="prerequisites"');
    expect(html).toContain("インストールから最初の表示まで");
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
    const html = await (await app.request("/api?lang=ja")).text();

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
    const authoring = await (await app.request("/docs/authoring?lang=ja")).text();
    const configuration = await (await app.request("/docs/configuration?lang=ja")).text();
    const routing = await (await app.request("/docs/routing?lang=ja")).text();
    const security = await (await app.request("/docs/security?lang=ja")).text();

    expect(authoring).toContain("まずサーバーコンポーネントを使う");
    expect(authoring).toContain("ブラウザ操作が必要な部品だけをIslandにする");
    expect(authoring).toContain("<code>dev</code>実行中は、保存したMDXが自動で再コンパイル");
    expect(configuration).toContain("ビルド対象、公開パス、実行時の挙動");
    expect(routing).toContain("はビューアー内のiframeが読み込むURL");
    expect(routing).toContain("slide</code>は1から始まるスライド番号");
    expect(routing).toContain("step=0</code>は段階表示がまだ始まっていない状態");
    expect(routing).toContain("標準ビューアーと外部埋め込みの印刷ボタンも表示されません");
    expect(routing).toContain("ブラウザ本来の印刷として動作します");
    expect(security).toContain("languageDetector");
    expect(security).toContain("hono-decks独自の認証は付きません");
    expect(security).toContain("同じnonceをCSPヘッダーとHTMLへ渡す");
    expect(security).toContain("許可していないオリジンでは拒否される");
  });

  it("documents the supported authoring syntax and its default boundaries", async () => {
    const ja = await (await app.request("/docs/authoring?lang=ja")).text();
    const en = await (await app.request("/docs/authoring?lang=en")).text();

    expect(ja).toContain('id="syntax"');
    expect(ja).toContain('id="notes"');
    expect(ja).toContain("本文はGFMとMDXで書く");
    expect(ja).toContain("GFM（テーブル、タスクリスト、打ち消し線、自動リンク）を使えます");
    expect(ja).not.toContain("追加設定なしで");
    expect(ja).toContain("&lt;Fire&gt;");
    expect(ja).toContain(":::fire");
    expect(ja).toContain("each=&quot;item&quot;");
    expect(ja).toContain("fire=&quot;scale&quot;");
    expect(ja).toContain("effect=&quot;blur-in&quot;");
    expect(ja).toContain("複数のJSX要素を同時に表示するときは");
    expect(ja).toContain("data-fire-effect=&quot;blur-in&quot;");
    expect(ja).toContain("--fire-filter");
    expect(ja).toContain("https://sli.dev/guide/animations");
    expect(ja).toContain("Slidevの");
    expect(ja).toContain("一部参考にしています");
    expect(ja).toContain("互換性は保証しません");
    expect(ja).toContain("at");
    expect(ja).toContain("depth");
    expect(ja).toContain("every");
    expect(ja).not.toContain("--hono-decks-fire-");
    expect(ja).not.toContain("$fire");
    expect(ja).not.toContain("fragments: list");
    expect(ja).toContain("@[x]");
    expect(ja).toContain("@[embed]");
    expect(ja).toContain("@[iframe]");
    expect(ja).toContain("MDXコメントは、コードの補足として書いた場合もノートとして扱われます");
    expect(ja).toContain("view-transition");
    expect(en).toContain("Write slide content with GFM and MDX");
    expect(en).toContain("Use CommonMark plus GFM tables, task lists, strikethrough, and autolinks");
    expect(en).not.toContain("without extra configuration");
    expect(en).toContain("Reveal content one step at a time with fire");
    expect(en).toContain("draw in part on Slidev");
    expect(en).toContain("compatibility with Slidev is not guaranteed");
    expect(en).toContain("to group multiple JSX elements into one step");
    expect(en).toContain("Every MDX comment is treated as a note");
  });

  it("renders language-aware syntax highlighting while preserving copy controls", async () => {
    const gettingStarted = await (await app.request("/docs/getting-started?lang=ja")).text();
    const authoring = await (await app.request("/docs/authoring?lang=ja")).text();

    expect(gettingStarted).toContain('class="language-bash"');
    expect(gettingStarted).toContain('class="language-jsonc"');
    expect(authoring).toContain('class="language-mdx"');
    expect(authoring).toContain('class="language-tsx"');
    expect(authoring).toMatch(/<span style="color:#[A-Fa-f0-9]{6}/);
    expect(authoring).toContain('class="copy-button"');
  });

  it("links the Deploy to Cloudflare button to the isolated minimal example", async () => {
    const html = await (await app.request("/")).text();
    const css = await readFile(new URL("../app/style.css", import.meta.url), "utf8");

    expect(html).toContain("https://deploy.workers.cloudflare.com/button");
    expect(html).toContain(
      "https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fts-76%2Fhono-decks%2Ftree%2Fmain%2Fexamples%2Fminimal",
    );
    expect(html).not.toContain('aria-disabled="true"');
    expect(html).not.toContain("サンプル準備中");
    expect(css).toMatch(/\.cloudflare-deploy\s*\{[^}]*display:\s*inline-flex/);
    expect(css).toMatch(/\.cloudflare-deploy\s*\{[^}]*border:\s*0\s*;/);
    expect(css).toMatch(/\.cloudflare-deploy\s*\{[^}]*background:\s*transparent\s*;/);
    expect(css).toMatch(/\.cloudflare-deploy\s*\{[^}]*padding:\s*0\s*;/);
    expect(css).toMatch(/\.cloudflare-deploy\s*\{[^}]*border-radius:\s*0\s*;/);
    expect(css).toMatch(/\.cloudflare-deploy\s+img\s*\{[^}]*display:\s*block/);
  });

  it("uses button-controlled SP navigation without details or summary", async () => {
    const html = await (await app.request("/docs/getting-started")).text();

    expect(html).toContain('src="/app/client.ts"');
    expect(html).toContain('data-copy-status="true"');
    expect(html).toContain('class="disclosure-trigger mobile-menu-trigger"');
    expect(html).toContain('aria-controls="mobile-menu-panel"');
    expect(html).not.toContain('aria-controls="docs-switcher-panel"');
    expect(html).not.toContain("Choose a guide");
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
