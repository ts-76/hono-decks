import type { CompiledDeck, DeckPaths } from "hono-decks";
import { localizedHref, type Locale } from "./i18n";

type DeckPathResolver = (slug: string) => DeckPaths;

export function renderHonoXDeckIndexPage(input: {
  decks: CompiledDeck[];
  paths: DeckPathResolver;
  locale: Locale;
}) {
  const isJa = input.locale === "ja";
  return (
    <>
      <a class="archive-skip" href="#published-talks">
        {isJa ? "登壇資料へ移動" : "Skip to published talks"}
      </a>
      <header class="archive-header">
        <a
          class="archive-brand"
          href={localizedHref("/", input.locale)}
          aria-label="ts-76 Talks home"
        >
          <span aria-hidden="true">H</span>
          <strong>ts-76 / Talks</strong>
        </a>
        <nav aria-label={isJa ? "アーカイブナビゲーション" : "Archive navigation"}>
          <a class="archive-portfolio-link" href={localizedHref("/", input.locale)}>
            Portfolio
          </a>
          <span
            class="archive-language-switcher"
            aria-label={isJa ? "言語" : "Language"}
            role="group"
          >
            <a
              href={localizedHref("/decks", "ja")}
              lang="ja"
              aria-current={isJa ? "true" : undefined}
            >
              JA
            </a>
            <span aria-hidden="true">/</span>
            <a
              href={localizedHref("/decks", "en")}
              lang="en"
              aria-current={!isJa ? "true" : undefined}
            >
              EN
            </a>
          </span>
          <a href="https://github.com/ts-76/hono-decks">GitHub ↗</a>
        </nav>
      </header>

      <main class="talk-archive">
        <section class="archive-hero" aria-labelledby="archive-title">
          <div class="archive-hero-copy">
            <p>Presentations by ts-76</p>
            <h1 id="archive-title">
              Talk
              <br />
              archive.
            </h1>
            <span>
              {isJa
                ? "登壇資料を、ポートフォリオと同じHonoXアプリから届ける。"
                : "Publish presentations from the same HonoX application as the portfolio."}
            </span>
          </div>
          <div class="archive-poster" aria-hidden="true">
            <span>HonoX</span>
            <strong>Talks</strong>
            <small>2026 / Tokyo</small>
          </div>
        </section>

        <section
          id="published-talks"
          class="published-talks"
          aria-labelledby="published-talks-title"
        >
          <header class="published-talks-heading">
            <h2 id="published-talks-title">{isJa ? "公開中の登壇資料" : "Published talks"}</h2>
            <p>
              {isJa
                ? `${input.decks.length}件の登壇資料`
                : input.decks.length === 1
                  ? "1 presentation"
                  : `${input.decks.length} presentations`}{" "}
              —{" "}
              {isJa
                ? "viewer、発表画面、印刷レイアウトを同じMDXから生成。"
                : "viewer, presentation, and print layouts generated from the same MDX."}
            </p>
          </header>

          <div class="archive-talk-list">
            {input.decks.map((deck) => {
              const paths = input.paths(deck.slug);
              const title = deck.meta.title ?? deck.slug;
              return (
                <article class="archive-talk">
                  <a
                    class="archive-talk-preview"
                    href={localizedHref(paths.viewer, input.locale)}
                    aria-label={isJa ? `${title}を開く` : `Open ${title}`}
                  >
                    <span class="archive-talk-poster">
                      <small>
                        {isJa ? "HonoXポートフォリオパターン" : "HonoX portfolio pattern"}
                      </small>
                      <strong>
                        HonoX +<br />
                        hono-decks
                      </strong>
                      <i aria-hidden="true">X</i>
                      <b>
                        {isJa
                          ? "ページと登壇資料を、1つのHonoアプリで。"
                          : "Pages and presentations, one Hono application."}
                      </b>
                    </span>
                  </a>
                  <div class="archive-talk-copy">
                    <p class="archive-talk-meta">
                      {deck.meta.date ? (
                        <time datetime={deck.meta.date}>
                          {formatArchiveDate(deck.meta.date, input.locale)}
                        </time>
                      ) : null}
                      <span>
                        {isJa ? `${deck.slides.length}枚` : `${deck.slides.length} slides`}
                      </span>
                    </p>
                    <h3>{title}</h3>
                    <p class="archive-talk-description">
                      {isJa
                        ? "HonoXのポートフォリオに、登壇資料をそのまま組み込む"
                        : "Embed a presentation directly in a HonoX portfolio."}
                    </p>
                    {deck.meta.tags?.length ? (
                      <ul
                        class="archive-talk-tags"
                        aria-label={isJa ? `${title}のトピック` : `${title} topics`}
                      >
                        {deck.meta.tags.map((tag) => (
                          <li>{tag}</li>
                        ))}
                      </ul>
                    ) : null}
                    <nav
                      class="archive-talk-actions"
                      aria-label={isJa ? `${title}の登壇資料リンク` : `${title} presentation links`}
                    >
                      <a class="primary" href={localizedHref(paths.viewer, input.locale)}>
                        {isJa ? "スライドを見る" : "View slides"} <span aria-hidden="true">→</span>
                      </a>
                      <a href={localizedHref(paths.presentation, input.locale)}>
                        {isJa ? "発表画面" : "Presentation"} <span aria-hidden="true">↗</span>
                      </a>
                      <a href={localizedHref(paths.print, input.locale)}>
                        {isJa ? "印刷表示" : "Print view"}
                      </a>
                    </nav>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section class="archive-method" aria-labelledby="archive-method-title">
          <h2 id="archive-method-title">
            {isJa ? "デッキも" : "The deck is"}
            <br />
            {isJa ? "サイトの一部。" : "part of the site."}
          </h2>
          <div>
            <p>
              {isJa
                ? "資料だけを別サービスへ切り離さず、プロフィール、登壇履歴、SEO、共有URLと一緒に育てられる構成です。"
                : "Keep talks together with your profile, speaking history, SEO, and shareable URLs instead of moving them to a separate service."}
            </p>
            <code>app/routes/decks/index.ts</code>
          </div>
        </section>
      </main>

      <footer class="archive-footer">
        <p>{isJa ? "HonoXとhono-decksで構築。" : "Built with HonoX and hono-decks."}</p>
        <a href={localizedHref("/", input.locale)}>
          {isJa ? "Portfolioへ戻る" : "Back to portfolio"}
        </a>
      </footer>
    </>
  );
}

export function renderHonoXDeckIndexHead(locale: Locale) {
  const isJa = locale === "ja";
  return (
    <>
      <meta
        name="description"
        content={
          isJa
            ? "ts-76の登壇資料をHonoXポートフォリオから閲覧できるトークアーカイブ"
            : "A talk archive published from the ts-76 HonoX portfolio."
        }
      />
      <meta name="theme-color" content="#111216" />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content={isJa ? "ja_JP" : "en_US"} />
      <meta
        property="og:title"
        content={isJa ? "登壇資料一覧 — ts-76 Talks" : "Talk archive — ts-76 Talks"}
      />
      <meta
        property="og:description"
        content={
          isJa
            ? "HonoXとhono-decksで公開する登壇資料アーカイブ"
            : "A presentation archive powered by HonoX and hono-decks."
        }
      />
      <link rel="alternate" hreflang="ja" href={localizedHref("/decks", "ja")} />
      <link rel="alternate" hreflang="en" href={localizedHref("/decks", "en")} />
      <style id="honox-deck-index-css">{honoXDeckIndexStyle}</style>
    </>
  );
}

function formatArchiveDate(value: string, locale: Locale): string {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en", {
        year: "numeric",
        month: locale === "ja" ? "2-digit" : "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(date);
}

const honoXDeckIndexStyle = `
:root {
  color-scheme: light;
  --archive-ink: #111216;
  --archive-copy: #fff8f3;
  --archive-surface: #f7f5f3;
  --archive-muted: #5a5758;
  --archive-line: #c8c2be;
  --archive-accent: #f45b1f;
  --archive-accent-soft: #ff9b70;
  --archive-content: 1180px;
  background: var(--archive-surface);
  color: var(--archive-ink);
  font-family: "Avenir Next", "Hiragino Sans", "Yu Gothic", ui-sans-serif, system-ui, sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}
* { box-sizing: border-box; }
body { margin: 0; min-width: 320px; overflow-x: clip; background: var(--archive-surface); color: var(--archive-ink); }
a { color: inherit; }
:focus-visible { outline: 3px solid var(--archive-accent); outline-offset: 4px; }
.archive-skip { position: fixed; z-index: 20; top: 12px; left: 12px; translate: 0 -180%; background: white; padding: 10px 14px; color: var(--archive-ink); font-weight: 720; text-decoration: none; }
.archive-skip:focus { translate: 0; }
.archive-header { display: flex; width: min(var(--archive-content), calc(100% - 48px)); min-height: 82px; align-items: center; justify-content: space-between; gap: 24px; margin: 0 auto; border-bottom: 1px solid rgba(255, 248, 243, .2); color: var(--archive-copy); }
.archive-brand { display: inline-flex; flex: 0 0 auto; align-items: center; gap: 10px; white-space: nowrap; text-decoration: none; }
.archive-brand span { display: grid; width: 36px; height: 36px; place-items: center; background: var(--archive-accent); color: var(--archive-ink); font-weight: 850; transform: rotate(-4deg); }
.archive-brand strong { font-size: .94rem; letter-spacing: -.02em; }
.archive-header nav { display: flex; flex: 0 0 auto; align-items: center; gap: 28px; font-size: .82rem; font-weight: 680; }
.archive-header nav a, .archive-language-switcher { display: inline-flex; min-height: 44px; align-items: center; }
.archive-header nav a { padding: 0; text-decoration: none; }
.archive-header nav a:hover { color: var(--archive-accent-soft); }
.archive-language-switcher { display: inline-flex; align-items: center; gap: 6px; }
.archive-header .archive-language-switcher a { display: inline-flex; min-width: 44px; min-height: 44px; align-items: center; justify-content: center; padding: 0; opacity: .58; }
.archive-header .archive-language-switcher a[aria-current] { opacity: 1; color: var(--archive-accent-soft); }
.talk-archive { margin-top: -82px; }
.archive-hero { display: grid; min-height: 720px; grid-template-columns: minmax(0, 1.15fr) minmax(300px, .85fr); gap: clamp(48px, 8vw, 120px); align-items: center; background: var(--archive-ink); padding: 154px max(24px, calc((100vw - var(--archive-content)) / 2)) 88px; color: var(--archive-copy); }
.archive-hero-copy > p { margin: 0 0 24px; color: var(--archive-accent-soft); font-size: .82rem; font-weight: 720; }
.archive-hero-copy h1 { max-width: 8ch; margin: 0; font-size: clamp(4rem, 8vw, 6rem); letter-spacing: -.04em; line-height: .84; text-wrap: balance; }
.archive-hero-copy > span { display: block; max-width: 34ch; margin-top: 30px; color: #d7d0cb; font-size: clamp(1rem, 1.5vw, 1.18rem); line-height: 1.7; text-wrap: pretty; }
.archive-poster { display: grid; aspect-ratio: 4 / 5; grid-template-rows: auto 1fr auto; background: var(--archive-accent); padding: clamp(24px, 4vw, 48px); color: var(--archive-ink); transform: rotate(2deg); }
.archive-poster span { font-size: .86rem; font-weight: 760; }
.archive-poster strong { align-self: center; font-size: clamp(3.8rem, 7vw, 6rem); letter-spacing: -.04em; line-height: .8; writing-mode: vertical-rl; }
.archive-poster small { justify-self: end; font-size: .75rem; font-weight: 720; }
.published-talks { padding: clamp(82px, 10vw, 144px) max(24px, calc((100vw - var(--archive-content)) / 2)); }
.published-talks-heading { display: flex; align-items: end; justify-content: space-between; gap: 32px; margin-bottom: 54px; }
.published-talks-heading h2 { margin: 0; font-size: clamp(2.8rem, 5.5vw, 4.7rem); letter-spacing: -.04em; line-height: .94; }
.published-talks-heading p { max-width: 40ch; margin: 0; color: var(--archive-muted); line-height: 1.7; text-wrap: pretty; }
.archive-talk-list { border-top: 1px solid var(--archive-ink); }
.archive-talk { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(300px, .65fr); border-bottom: 1px solid var(--archive-line); }
.archive-talk-preview { display: block; min-width: 0; border-right: 1px solid var(--archive-line); padding: clamp(26px, 4vw, 46px) clamp(26px, 4vw, 46px) clamp(26px, 4vw, 46px) 0; text-decoration: none; }
.archive-talk-poster { position: relative; display: grid; width: 100%; aspect-ratio: 16 / 9; grid-template-rows: auto 1fr auto; overflow: hidden; background: var(--archive-ink); padding: clamp(22px, 4vw, 48px); color: var(--archive-copy); transition: translate 200ms cubic-bezier(.22, 1, .36, 1); }
.archive-talk-preview:hover .archive-talk-poster { translate: 0 -4px; }
.archive-talk-poster small { color: var(--archive-accent-soft); font-size: clamp(.62rem, 1.1vw, .78rem); font-weight: 720; }
.archive-talk-poster strong { max-width: 9ch; align-self: end; font-size: clamp(2.2rem, 4.8vw, 4.8rem); letter-spacing: -.04em; line-height: .86; text-wrap: balance; }
.archive-talk-poster i { position: absolute; right: 8%; top: 28%; display: grid; width: 22%; aspect-ratio: 1; place-items: center; background: var(--archive-accent); color: var(--archive-ink); font-size: clamp(2.8rem, 7vw, 6.5rem); font-style: normal; font-weight: 850; transform: rotate(-4deg); }
.archive-talk-poster b { max-width: 28ch; margin-top: 20px; color: #d7d0cb; font-size: clamp(.66rem, 1.1vw, .84rem); font-weight: 550; line-height: 1.45; }
.archive-talk-copy { display: flex; min-width: 0; flex-direction: column; padding: clamp(30px, 4vw, 48px) 0 clamp(30px, 4vw, 48px) clamp(28px, 4vw, 48px); }
.archive-talk-meta { display: flex; flex-wrap: wrap; gap: 8px 18px; margin: 0; color: var(--archive-muted); font-size: .74rem; }
.archive-talk-copy h3 { max-width: 12ch; margin: clamp(42px, 7vw, 92px) 0 20px; font-size: clamp(2.5rem, 4.5vw, 4.25rem); letter-spacing: -.04em; line-height: .94; overflow-wrap: anywhere; text-wrap: balance; }
.archive-talk-description { max-width: 42ch; margin: 0; color: var(--archive-muted); line-height: 1.75; text-wrap: pretty; }
.archive-talk-tags { display: flex; flex-wrap: wrap; gap: 8px; margin: 24px 0 0; padding: 0; list-style: none; }
.archive-talk-tags li { border: 1px solid var(--archive-line); border-radius: 999px; padding: 6px 10px; font-size: .7rem; }
.archive-talk-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: auto; padding-top: 32px; }
.archive-talk-actions a { display: inline-flex; min-height: 46px; align-items: center; justify-content: center; gap: 14px; border: 1px solid var(--archive-ink); padding: 0 16px; font-size: .78rem; font-weight: 720; text-decoration: none; transition: background-color 160ms ease, color 160ms ease, translate 180ms cubic-bezier(.22, 1, .36, 1); }
.archive-talk-actions a.primary { border-color: var(--archive-accent); background: var(--archive-accent); }
.archive-talk-actions a:hover { translate: 0 -2px; background: var(--archive-ink); color: var(--archive-copy); }
.archive-method { display: grid; grid-template-columns: minmax(280px, .7fr) minmax(0, 1.3fr); gap: clamp(44px, 8vw, 110px); background: var(--archive-accent); padding: clamp(72px, 9vw, 120px) max(24px, calc((100vw - var(--archive-content)) / 2)); }
.archive-method h2 { margin: 0; font-size: clamp(2.6rem, 5vw, 4.5rem); letter-spacing: -.04em; line-height: .91; }
.archive-method div { align-self: end; }
.archive-method p { max-width: 54ch; margin: 0; font-size: clamp(1.05rem, 1.8vw, 1.28rem); line-height: 1.75; text-wrap: pretty; }
.archive-method code { display: inline-block; margin-top: 28px; background: rgba(17, 18, 22, .13); padding: 7px 10px; font-size: .76rem; }
.archive-footer { display: flex; width: min(var(--archive-content), calc(100% - 48px)); min-height: 116px; align-items: center; justify-content: space-between; gap: 24px; margin: 0 auto; color: var(--archive-muted); font-size: .8rem; }
.archive-footer a { color: var(--archive-ink); font-weight: 720; text-decoration: none; }
@media (max-width: 820px) {
  .archive-hero, .archive-talk, .archive-method { grid-template-columns: 1fr; }
  .archive-hero { min-height: 0; padding-top: 150px; }
  .archive-poster { width: min(100%, 420px); justify-self: end; }
  .published-talks-heading { align-items: start; flex-direction: column; }
  .archive-talk-preview { padding-right: 0; border-right: 0; }
  .archive-talk-copy { min-height: 360px; padding-left: 0; }
}
@media (max-width: 560px) {
  .archive-header, .archive-footer { width: min(var(--archive-content), calc(100% - 32px)); }
  .archive-header nav { gap: 16px; }
  .archive-portfolio-link { display: none; }
  .archive-hero { padding-right: 16px; padding-left: 16px; }
  .archive-hero-copy h1 { font-size: clamp(3.7rem, 18vw, 5rem); }
  .published-talks { padding-right: 16px; padding-left: 16px; }
  .archive-poster { width: min(88vw, 360px); }
  .archive-method { padding-right: 16px; padding-left: 16px; }
  .archive-footer { align-items: flex-start; flex-direction: column; justify-content: center; }
}
@media (max-width: 420px) {
  .archive-brand strong { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .archive-brand span, .archive-poster { transform: none; }
  .archive-talk-poster, .archive-talk-actions a { transition: none; }
  .archive-talk-preview:hover .archive-talk-poster, .archive-talk-actions a:hover { translate: none; }
  .archive-talk-poster i { transform: none; }
}
`;
