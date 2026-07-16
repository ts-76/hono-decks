import { createRoute } from "honox/factory";
import { getLocale, localizedHref } from "../i18n";
import { CodeBlock, DeployToCloudflare, RouteTable } from "../site";

const installCode = `npm install hono-decks
npx hono-decks init
npx hono-decks compile`;

export default createRoute((c) => {
  const locale = getLocale(c);
  const isJa = locale === "ja";
  return c.render(
    <main class="home">
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-copy">
          <h1 id="hero-title">
            {isJa ? <><span class="line-unit"><em>Honoアプリ</em>に</span><br /><span class="line-unit">スライドを。</span></> : <>Slides belong in<br /><em>your Hono app.</em></>}
          </h1>
          <p class="hero-lede">
            {isJa
              ? "MDXをHono JSXへコンパイルし、ビューアー、発表画面、発表者画面、印刷画面を既存のHonoアプリへ追加します。"
              : "Compile MDX to Hono JSX, then add viewer, presentation, presenter, and print routes to an existing Hono application."}
          </p>
          <div class="hero-actions">
            <a class="button button-primary" href={localizedHref("/docs/getting-started", locale)}>
              {isJa ? "導入手順" : "Get started"} <span aria-hidden="true">→</span>
            </a>
            <a class="button button-secondary" href={localizedHref("/api", locale)}>
              {isJa ? "APIを見る" : "Explore the API"}
            </a>
          </div>
        </div>
          <div class="hero-demo" aria-label={isJa ? "hono-decksの操作デモ" : "Interactive hono-decks demo"}>
          <div class="demo-toolbar">
            <span class="demo-live"><i aria-hidden="true"></i>{isJa ? "ライブデモ" : "Live deck"}</span>
            <code>GET /demo/product/embed</code>
          </div>
          <iframe
            src="/demo/product/embed"
            title={isJa ? "hono-decks 製品紹介スライド" : "hono-decks product tour"}
            loading="eager"
            allow="fullscreen"
          ></iframe>
          <div class="demo-meta">
            <p>{isJa ? "このページと同じHonoXアプリに、MDXから生成したデッキを組み込んでいます。スライドの左右または矢印キーで操作できます。" : "Compiled from MDX and mounted in this HonoX app. Use the slide halves or arrow keys to navigate."}</p>
            <a href="/demo/product/embed" target="_blank" rel="noreferrer">
              {isJa ? "別ページで開く" : "Open full size"} <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </section>

      <section class="quickstart-section" aria-labelledby="quickstart-title">
        <div>
          <h2 id="quickstart-title">{isJa ? "コンパイルして、ルーターを登録する" : "Compile the deck and mount its router."}</h2>
          <p>
            {isJa ? <>Node.jsを使うのはコンパイル時だけです。生成されたルーターを<code>app.route(decks.mountPath, decks.router())</code>で登録します。ViteまたはWranglerの<code>dev</code>コマンドから変更監視も起動できます。</> : <>Node is used only at compile time. Mount the generated router with <code>app.route(decks.mountPath, decks.router())</code>. The Vite or Wrangler <code>dev</code> command can also watch deck changes.</>}
          </p>
          <a class="text-link" href={localizedHref("/docs/getting-started", locale)}>
            {isJa ? "npm・pnpm・Yarn・Bunの導入手順" : "Setup for npm, pnpm, Yarn, and Bun"} <span aria-hidden="true">↗</span>
          </a>
        </div>
        <CodeBlock code={installCode} label="Terminal" locale={locale} />
      </section>

      <section class="surfaces-section" aria-labelledby="surfaces-title">
        <div class="section-intro compact">
          <h2 id="surfaces-title">{isJa ? "作成されるルート" : "Generated routes"}</h2>
          <p>{isJa ? "標準では外部埋め込みを除く各画面が作成されます。使わないルートは設定で無効にできます。認証はHonoアプリ側で追加します。" : "The standard router creates every surface except external embed. Disable unused routes in configuration and add authentication in the Hono application."}</p>
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

      <section class="deploy-section">
        <DeployToCloudflare locale={locale} />
      </section>
    </main>,
    {
      activePath: "/",
      description: isJa ? "MDXスライドをHonoのルートとして生成・配信するためのhono-decksドキュメント" : "Mount MDX slide routes in your existing Hono application with hono-decks",
    },
  );
});
