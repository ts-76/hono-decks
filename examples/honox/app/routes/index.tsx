import { createRoute } from "honox/factory";
import { decks } from "../decks";
import { getLocale, localizedHref } from "../i18n";

export default createRoute((c) => {
  const locale = getLocale(c);
  const isJa = locale === "ja";
  const paths = decks.paths("honox");
  return c.render(
    <main id="main-content">
      <section class="portfolio-hero" aria-labelledby="portfolio-title">
        <div class="portfolio-hero-inner">
          <div>
            <p class="portfolio-intro">HonoX + MDX example</p>
            <h1 id="portfolio-title">{isJa ? "HonoXで登壇資料を公開する" : "Publish talks with HonoX"}</h1>
          </div>
          <div>
            <p class="portfolio-lede">
              {isJa
                ? "HonoXのページとMDXの登壇資料を、同じアプリから配信するサンプルです。"
                : "A sample that serves HonoX pages and MDX presentations from the same application."}
            </p>
            <dl class="portfolio-facts">
              <div>
                <dt>Runtime</dt>
                <dd>Cloudflare Workers</dd>
              </div>
              <div>
                <dt>Authoring</dt>
                <dd>MDX + Hono JSX</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section id="talks" class="talks" aria-labelledby="talks-title">
        <header class="talks-heading">
          <h2 id="talks-title">{isJa ? "登壇資料" : "Talk"}</h2>
          <p>
            {isJa
              ? "ビューアー、発表画面、印刷用レイアウトを同じデッキソースから生成します。"
              : "The viewer, presentation screen, and print layout share one deck source."}
          </p>
        </header>
        <article class="talk-feature">
          <div class="talk-preview">
            <iframe
              src={localizedHref(paths.embed, locale)}
              title={isJa ? "HonoX + hono-decks スライドプレビュー" : "HonoX + hono-decks slide preview"}
              loading="eager"
              allow="fullscreen"
            ></iframe>
          </div>
          <div class="talk-copy">
            <p class="talk-meta">
              <time datetime="2026-07-17">2026.07.17</time>
              <span>Architecture / 3 slides</span>
            </p>
            <h3>HonoX + hono-decks</h3>
            <p class="talk-description">
              {isJa
                ? "ファイルベースのページと、ビルド時に生成したdeck routerを1つのHonoアプリへ組み込む例です。"
                : "An example of mounting file-based pages and a build-generated deck router in one Hono application."}
            </p>
            <div class="talk-tags" aria-label={isJa ? "トピック" : "Topics"}>
              <span>HonoX</span>
              <span>MDX</span>
              <span>Cloudflare</span>
            </div>
            <nav class="talk-actions" aria-label={isJa ? "登壇資料リンク" : "Presentation links"}>
              <a class="primary" href={localizedHref(paths.viewer, locale)}>
                {isJa ? "スライドを見る" : "View slides"} <span aria-hidden="true">→</span>
              </a>
              <a class="secondary" href={localizedHref(paths.presentation, locale)}>
                {isJa ? "発表画面を開く" : "Open presentation"} <span aria-hidden="true">↗</span>
              </a>
            </nav>
          </div>
        </article>
      </section>

      <section class="portfolio-note" aria-labelledby="portfolio-note-title">
        <h2 id="portfolio-note-title">One app</h2>
        <p>
          {isJa ? (
            <>
              HonoXがページ、ナビゲーション、SEOを担当し、<code>app/routes/decks/index.ts</code>が生成済みのdeck
              routerをマウントします。
            </>
          ) : (
            <>
              HonoX owns pages, navigation, and SEO while <code>app/routes/decks/index.ts</code> mounts the generated
              deck router.
            </>
          )}
        </p>
      </section>
    </main>,
  );
});
