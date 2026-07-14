import { createRoute } from "honox/factory";
import { getLocale, localizedHref } from "../i18n";
import { CodeBlock, DeployToCloudflare, RouteTable } from "../site";

const installCode = `bun add hono-decks
bunx hono-decks init
bunx hono-decks compile`;

export default createRoute((c) => {
  const locale = getLocale(c);
  const isJa = locale === "ja";
  return c.render(
    <main class="home">
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-copy">
          <p class="hero-signal">
            <span aria-hidden="true"></span> {isJa ? "Honoアプリに組み込むMDXスライド" : "Hono route kit for MDX slides"}
          </p>
          <h1 id="hero-title">
            {isJa ? <><span class="line-unit"><em>Honoアプリ</em>に</span><br /><span class="line-unit">スライドを。</span></> : <>Slides belong in<br /><em>your Hono app.</em></>}
          </h1>
          <p class="hero-lede">
            {isJa
              ? "MDXをHono JSXモジュールへ変換し、ビューアー、発表画面、発表者画面、出力機能を既存のHonoアプリへ追加します。"
              : "Compile MDX into Hono JSX modules, then mount viewer, presentation, presenter, and export surfaces as ordinary routes in your existing Hono app."}
          </p>
          <div class="hero-actions">
            <a class="button button-primary" href={localizedHref("/docs/getting-started", locale)}>
              {isJa ? "導入手順を見る" : "Start in five minutes"} <span aria-hidden="true">→</span>
            </a>
            <a class="button button-secondary" href={localizedHref("/api", locale)}>
              {isJa ? "APIを見る" : "Explore the API"}
            </a>
          </div>
          <dl class="hero-facts">
            <div>
              <dt>{isJa ? "実行環境" : "Runtime"}</dt>
              <dd>Hono + Web Standards</dd>
            </div>
            <div>
              <dt>{isJa ? "記述" : "Authoring"}</dt>
              <dd>MDX + local components</dd>
            </div>
          </dl>
        </div>
        <div class="hero-demo" aria-label={isJa ? "操作できるhono-decksのデモ" : "Interactive hono-decks demo"}>
          <div class="demo-toolbar">
            <span class="demo-live"><i aria-hidden="true"></i>{isJa ? "操作できるデッキ" : "Live deck"}</span>
            <code>GET /demo/product/embed</code>
          </div>
          <iframe
            src="/demo/product/embed"
            title={isJa ? "hono-decks 製品紹介スライド" : "hono-decks product tour"}
            loading="eager"
            allow="fullscreen"
          ></iframe>
          <div class="demo-meta">
            <p>{isJa ? "このHonoXアプリでMDXから生成しています。スライドの左右、または矢印キーで操作できます。" : "Compiled from MDX and mounted in this HonoX app. Use the slide halves or arrow keys to navigate."}</p>
            <a href="/demo/product/embed" target="_blank" rel="noreferrer">
              {isJa ? "大きく表示" : "Open full size"} <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </section>

      <section class="boundary-section" aria-labelledby="boundary-title">
        <div class="section-intro">
          <h2 id="boundary-title">{isJa ? <><span class="line-unit">Node.jsで生成し、</span><wbr /><span class="line-unit">Honoで配信する</span></> : "Compile with Node. Serve with Hono."}</h2>
          <p>
            {isJa ? "Node.jsを使うのはローカルファイルの読み込みとコンパイルだけです。Workerでは生成済みモジュールをHonoのルートとして配信します。" : "Node.js handles local file I/O and compilation only. Generated modules and Hono routes are all that reach your Worker."}
          </p>
        </div>
        <div class="boundary-flow" aria-label="Build and runtime boundaries">
          <div>
            <span>01</span>
            <strong>{isJa ? "作成" : "Author"}</strong>
            <code>decks/*/deck.mdx</code>
          </div>
          <i aria-hidden="true">→</i>
          <div>
            <span>02</span>
            <strong>{isJa ? "生成" : "Compile"}</strong>
            <code>hono-decks compile</code>
          </div>
          <i aria-hidden="true">→</i>
          <div>
            <span>03</span>
            <strong>{isJa ? "登録" : "Route"}</strong>
            <code>app.route("/decks", …)</code>
          </div>
        </div>
      </section>

      <section class="quickstart-section" aria-labelledby="quickstart-title">
        <div>
          <p class="section-note">{isJa ? "既存のHonoアプリへ追加できます" : "Add it to your existing Hono app."}</p>
          <h2 id="quickstart-title">{isJa ? "デッキを生成する" : "Install the package and compile your decks."}</h2>
          <p>
            {isJa ? <>コンパイラーは<code>hono-decks/node</code>から読み込みます。通常の<code>hono-decks</code>エントリーには、Workerで使える実行時APIだけが含まれます。</> : <>Compiler dependencies stay in <code>hono-decks/node</code>; the standard entry exposes Worker-safe runtime APIs only.</>}
          </p>
          <a class="text-link" href={localizedHref("/docs/getting-started", locale)}>
            {isJa ? "導入手順を読む" : "Read the setup guide"} <span aria-hidden="true">↗</span>
          </a>
        </div>
        <CodeBlock code={installCode} label="Terminal" locale={locale} />
      </section>

      <section class="deploy-section">
        <DeployToCloudflare locale={locale} />
      </section>

      <section class="surfaces-section" aria-labelledby="surfaces-title">
        <div class="section-intro compact">
          <h2 id="surfaces-title">{isJa ? <><span class="line-unit">必要な画面だけ</span><wbr /><span class="line-unit">ルートとして公開する</span></> : "Every surface is a route."}</h2>
          <p>{isJa ? "標準のUIをそのまま使うことも、リクエストに応じて画面ごとの設定を変えることもできます。" : "Use the default UI and override only the surfaces that need request context."}</p>
        </div>
        <RouteTable
          rows={[
            ["/:slug", isJa ? "iframeを使ったビューアーと操作ボタン" : "Iframe viewer and navigation controls"],
            ["/:slug/render", isJa ? "iframe内に表示するスライド" : "Isolated slide runtime"],
            ["/:slug/presentation", isJa ? "発表用の全画面表示" : "Projection surface"],
            ["/:slug/presenter", isJa ? "次のスライドと発表者ノート" : "Next preview and speaker notes"],
            ["/:slug/print", isJa ? "印刷・PDF出力用の画面" : "Browser print / PDF source"],
          ]}
          locale={locale}
        />
      </section>
    </main>,
    {
      activePath: "/",
      description: isJa ? "MDXのスライドを既存のHonoアプリへ組み込むためのhono-decksドキュメント" : "Mount MDX slide routes in your existing Hono application with hono-decks",
    },
  );
});
