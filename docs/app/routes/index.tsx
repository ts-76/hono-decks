import { createRoute } from "honox/factory";
import { getLocale, localizedHref } from "../i18n";
import { CodeBlock, DeployToCloudflare, RouteTable } from "../site";

const installCode = `bun add hono-decks
bunx hono-decks init --out src/decks.ts
bunx hono-decks compile --root decks --out src/generated --mount /decks`;

export default createRoute((c) => {
  const locale = getLocale(c);
  const isJa = locale === "ja";
  return c.render(
    <main class="home">
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-copy">
          <p class="hero-signal">
            <span aria-hidden="true"></span> Hono route kit for MDX slides
          </p>
          <h1 id="hero-title">
            Slides belong in
            <br />
            <em>your Hono app.</em>
          </h1>
          <p class="hero-lede">
            {isJa
              ? "MDX を build-time に Hono JSX module へ。viewer、presentation、presenter、export を、既存の Hono app に普通の route として組み込みます。"
              : "Compile MDX into Hono JSX modules, then mount viewer, presentation, presenter, and export surfaces as ordinary routes in your existing Hono app."}
          </p>
          <div class="hero-actions">
            <a class="button button-primary" href={localizedHref("/docs/getting-started", locale)}>
              {isJa ? "5分で始める" : "Start in five minutes"} <span aria-hidden="true">→</span>
            </a>
            <a class="button button-secondary" href={localizedHref("/api", locale)}>
              {isJa ? "API を見る" : "Explore the API"}
            </a>
          </div>
          <dl class="hero-facts">
            <div>
              <dt>Runtime</dt>
              <dd>Hono + Web Standards</dd>
            </div>
            <div>
              <dt>Authoring</dt>
              <dd>MDX + local components</dd>
            </div>
          </dl>
        </div>
        <div class="hero-demo" aria-label={isJa ? "操作できるhono-decksのデモ" : "Interactive hono-decks demo"}>
          <div class="demo-toolbar">
            <span class="demo-live"><i aria-hidden="true"></i>{isJa ? "実際のdeck" : "Live deck"}</span>
            <code>GET /demo/product/embed</code>
          </div>
          <iframe
            src="/demo/product/embed"
            title={isJa ? "hono-decks 製品紹介スライド" : "hono-decks product tour"}
            loading="eager"
            allow="fullscreen"
          ></iframe>
          <div class="demo-meta">
            <p>{isJa ? "MDXから生成し、このHonoX appにmountしています。左右クリックまたは矢印キーで操作できます。" : "Compiled from MDX and mounted in this HonoX app. Use the slide halves or arrow keys to navigate."}</p>
            <a href="/demo/product/embed" target="_blank" rel="noreferrer">
              {isJa ? "大きく表示" : "Open full size"} <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </section>

      <section class="boundary-section" aria-labelledby="boundary-title">
        <div class="section-intro">
          <h2 id="boundary-title">A route kit, not another runtime.</h2>
          <p>
            {isJa ? "Node.js は local file I/O と compile だけ。Worker へ届くのは generated module と Hono route です。" : "Node.js handles local file I/O and compilation only. Generated modules and Hono routes are all that reach your Worker."}
          </p>
        </div>
        <div class="boundary-flow" aria-label="Build and runtime boundaries">
          <div>
            <span>01</span>
            <strong>Author</strong>
            <code>decks/*/deck.mdx</code>
          </div>
          <i aria-hidden="true">→</i>
          <div>
            <span>02</span>
            <strong>Compile</strong>
            <code>hono-decks compile</code>
          </div>
          <i aria-hidden="true">→</i>
          <div>
            <span>03</span>
            <strong>Route</strong>
            <code>app.route("/decks", …)</code>
          </div>
        </div>
      </section>

      <section class="quickstart-section" aria-labelledby="quickstart-title">
        <div>
          <p class="section-note">One install. One generated entry. Your app stays in control.</p>
          <h2 id="quickstart-title">Start from a clean boundary.</h2>
          <p>
            {isJa ? <>compiler dependencies は <code>hono-decks/node</code> に閉じ、標準 entry は Worker-safe な runtime API だけを公開します。</> : <>Compiler dependencies stay in <code>hono-decks/node</code>; the standard entry exposes Worker-safe runtime APIs only.</>}
          </p>
          <a class="text-link" href={localizedHref("/docs/getting-started", locale)}>
            {isJa ? "setup guide を読む" : "Read the setup guide"} <span aria-hidden="true">↗</span>
          </a>
        </div>
        <CodeBlock code={installCode} label="Terminal" locale={locale} />
      </section>

      <section class="deploy-section">
        <DeployToCloudflare locale={locale} />
      </section>

      <section class="surfaces-section" aria-labelledby="surfaces-title">
        <div class="section-intro compact">
          <h2 id="surfaces-title">Every surface is a route.</h2>
          <p>{isJa ? "既定 UI を使い、必要な surface だけ request-aware に上書きできます。" : "Use the default UI and override only the surfaces that need request context."}</p>
        </div>
        <RouteTable
          rows={[
            ["/:slug", isJa ? "iframe viewer と navigation controls" : "Iframe viewer and navigation controls"],
            ["/:slug/render", isJa ? "隔離された slide runtime" : "Isolated slide runtime"],
            ["/:slug/presentation", isJa ? "projection 専用 surface" : "Projection surface"],
            ["/:slug/presenter", isJa ? "next preview と speaker notes" : "Next preview and speaker notes"],
            ["/:slug/print", isJa ? "browser print / PDF source" : "Browser print / PDF source"],
          ]}
          locale={locale}
        />
      </section>
    </main>,
    {
      activePath: "/",
      description: isJa ? "MDX slide routes を既存の Hono application に組み込む hono-decks documentation" : "Mount MDX slide routes in your existing Hono application with hono-decks",
    },
  );
});
