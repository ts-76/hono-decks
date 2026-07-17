/** @jsxImportSource hono/jsx */

import {
  type CompiledDeck,
  type DeckPaths,
  type DeckEntry,
  type DeckPageMeta,
  type DeckRenderable,
  type DeckTocItem,
} from "hono-decks";

type DeckPathResolver = (slug: string) => DeckPaths;

export function renderHomePage(decks: DeckEntry[]) {
  return (
    <SampleLayout title="Hono Decks Basic" layout="home">
      <section class="sample-home-hero" aria-labelledby="sample-home-title">
        <div>
          <p class="sample-home-intro">Hono + MDX + Cloudflare Workers</p>
          <h1 id="sample-home-title">
            Slides belong
            <br />
            <span>inside your app.</span>
          </h1>
        </div>
        <div class="sample-home-summary">
          <p>hono-decks は登壇資料を別サービスへ切り離さず、Honoアプリのルートとして公開するための実装例です。</p>
          <nav class="sample-actions" aria-label="Primary">
            <a class="primary" href="/decks">
              Explore the deck lab <span aria-hidden="true">→</span>
            </a>
            <a href="/decks/sample/about">How it is wired</a>
          </nav>
        </div>
      </section>

      <section class="sample-home-decks" aria-labelledby="sample-home-decks-title">
        <header>
          <h2 id="sample-home-decks-title">Built to prove it.</h2>
          <p>同じWorkerで動く4つの資料。コード、メディア、モーション、アプリ統合をそれぞれ確認できます。</p>
        </header>
        <ul>
          {decks.map((deck) => (
            <li>
              <a href={`/decks/${encodeURIComponent(deck.slug)}`}>
                <span>{deck.title ?? deck.slug}</span>
                <small>{deck.description ?? "Open presentation"}</small>
                <strong aria-hidden="true">↗</strong>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section class="sample-home-system" aria-labelledby="sample-home-system-title">
        <h2 id="sample-home-system-title">
          Author in MDX.
          <br />
          Own the runtime.
        </h2>
        <div>
          <p>
            compile時に生成したdeck
            routerを、通常のHonoルートと同じアプリへmount。配信、埋め込み、印刷、発表画面までURL設計を自分で所有できます。
          </p>
          <code>app.route(decks.mountPath, decks.router())</code>
        </div>
      </section>
    </SampleLayout>
  );
}

export function renderDeckIndexPage(input: { decks: CompiledDeck[]; paths: DeckPathResolver }) {
  const priority = new Map(["sample", "code", "media", "motion"].map((slug, index) => [slug, index]));
  const decks = [...input.decks].sort(
    (left, right) =>
      (priority.get(left.slug) ?? Number.MAX_SAFE_INTEGER) - (priority.get(right.slug) ?? Number.MAX_SAFE_INTEGER),
  );
  const featured = decks[0];

  return (
    <>
      <a class="deck-index-skip" href="#deck-catalog">
        Skip to deck catalog
      </a>
      <header class="deck-index-header">
        <a class="deck-index-brand" href="/" aria-label="Hono Decks Basic home">
          <span aria-hidden="true">H</span>
          <strong>Hono Decks / Basic</strong>
        </a>
        <nav aria-label="Deck index navigation">
          <a href="#deck-catalog">All decks</a>
          <a href="https://github.com/ts-76/hono-decks">Source ↗</a>
        </nav>
      </header>

      <main class="deck-index-main">
        <section class="deck-index-hero" aria-labelledby="deck-index-title">
          <div>
            <p class="deck-index-intro">A working catalog for Hono + MDX</p>
            <h1 id="deck-index-title">
              Four decks.
              <br />
              <span>One edge runtime.</span>
            </h1>
          </div>
          <div class="deck-index-summary">
            <p>
              Code、media、motion、custom components。hono-decks
              の主要な表現を、それぞれ独立した登壇資料として確認できます。
            </p>
            <dl>
              <div>
                <dt>Runtime</dt>
                <dd>Cloudflare Workers</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>MDX + Hono JSX</dd>
              </div>
              <div>
                <dt>Collection</dt>
                <dd>{decks.length} compiled decks</dd>
              </div>
            </dl>
            {featured ? (
              <a class="deck-index-hero-link" href={input.paths(featured.slug).viewer}>
                Start with {featured.meta.title ?? featured.slug} <span aria-hidden="true">→</span>
              </a>
            ) : null}
          </div>
        </section>

        <section id="deck-catalog" class="deck-catalog" aria-labelledby="deck-catalog-title">
          <header class="deck-catalog-heading">
            <h2 id="deck-catalog-title">Deck catalog</h2>
            <p>各資料を閲覧・発表・印刷できる、軽量な静的カタログです。</p>
          </header>

          <div class="deck-showcase-list">
            {decks.map((deck) => {
              const paths = input.paths(deck.slug);
              const title = deck.meta.title ?? deck.slug;
              const tags = deck.meta.tags ?? [];
              return (
                <article class={`deck-showcase deck-showcase--${deck.slug}`}>
                  <a class="deck-showcase-preview" href={paths.viewer} aria-label={`Open ${title}`}>
                    <span class="deck-poster-label">{deckPosterLabel(deck.slug)}</span>
                    <strong>{title}</strong>
                    <span class="deck-poster-art" data-deck-art={deck.slug} aria-hidden="true">
                      {renderDeckPosterArt(deck.slug)}
                    </span>
                    <small>
                      {deck.slides.length} slides <span aria-hidden="true">→</span>
                    </small>
                  </a>
                  <div class="deck-showcase-copy">
                    <div class="deck-showcase-meta">
                      {deck.meta.date ? <time datetime={deck.meta.date}>{formatDeckDate(deck.meta.date)}</time> : null}
                      <span>{deck.slides.length} slides</span>
                    </div>
                    <h3>{title}</h3>
                    {deck.meta.description ? <p>{deck.meta.description}</p> : null}
                    {tags.length > 0 ? (
                      <ul class="deck-showcase-tags" aria-label={`${title} topics`}>
                        {tags.map((tag) => (
                          <li>{tag}</li>
                        ))}
                      </ul>
                    ) : null}
                    <nav class="deck-showcase-actions" aria-label={`${title} actions`}>
                      <a class="primary" href={paths.viewer}>
                        View deck <span aria-hidden="true">→</span>
                      </a>
                      <a href={paths.presentation}>
                        Present <span aria-hidden="true">↗</span>
                      </a>
                      <a href={`${paths.viewer}/about`}>Details</a>
                    </nav>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <footer class="deck-index-footer">
        <p>Compiled at build time. Served from the edge.</p>
        <a href="/">Back to Basic example</a>
      </footer>
    </>
  );
}

export function renderDeckIndexHead() {
  return (
    <>
      <meta
        name="description"
        content="Four production-ready hono-decks examples for code, media, motion, and Hono integration."
      />
      <meta name="theme-color" content="#111216" />
      <meta property="og:title" content="Deck Lab — Hono Decks Basic" />
      <meta
        property="og:description"
        content="Explore four MDX presentation patterns running on Hono and Cloudflare Workers."
      />
      <style id="basic-deck-index-css">{basicDeckIndexStyle}</style>
    </>
  );
}

function formatDeckDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(date);
}

function deckPosterLabel(slug: string): string {
  return (
    {
      sample: "Hono + MDX + Workers",
      code: "Syntax highlighted source",
      media: "Assets and social media",
      motion: "Motion with reduced-motion",
    }[slug] ?? "hono-decks presentation"
  );
}

function renderDeckPosterArt(slug: string) {
  if (slug === "sample") return <b>H</b>;
  if (slug === "code") return <code>const deck = mdx()</code>;
  if (slug === "media")
    return (
      <>
        <i></i>
        <i></i>
        <i></i>
      </>
    );
  if (slug === "motion") return <i></i>;
  return <b>↗</b>;
}

export function renderDeckDetailsPage(input: { deck: CompiledDeck; meta: DeckPageMeta; toc: DeckTocItem[] }) {
  const description = input.meta.description;

  return (
    <SampleLayout
      title={`${input.meta.title} - Details`}
      layout="deck-details"
      head={
        <>
          {description ? <meta name="description" content={description} /> : null}
          <meta property="og:title" content={input.meta.title} />
          {description ? <meta property="og:description" content={description} /> : null}
          <meta property="og:url" content={input.meta.paths.viewer} />
          {input.meta.imagePath ? <meta property="og:image" content={input.meta.imagePath} /> : null}
        </>
      }
    >
      <section class="sample-page-section">
        <p class="sample-kicker">Deck details</p>
        <h1>{input.meta.title}</h1>
        {input.meta.description ? <p>{input.meta.description}</p> : null}
        <dl class="sample-meta-list">
          <div>
            <dt>Source</dt>
            <dd>{input.deck.sourcePath}</dd>
          </div>
          <div>
            <dt>Slides</dt>
            <dd>{input.deck.slides.length}</dd>
          </div>
        </dl>
        <nav class="sample-actions" aria-label="Deck actions">
          <a href={input.meta.paths.viewer}>Open viewer</a>
          <a href={input.meta.paths.render}>Open render page</a>
          <a href={input.meta.paths.print}>Open print page</a>
          <a href={input.meta.paths.embed}>Embed view</a>
        </nav>
      </section>
      <section class="sample-page-section">
        <h2>Table of contents</h2>
        <ol class="sample-toc">
          {input.toc.map((slide) => (
            <li>
              <span>{slide.index + 1}</span>
              {slide.label}
            </li>
          ))}
        </ol>
      </section>
    </SampleLayout>
  );
}

function SampleLayout(props: { title: string; layout: string; head?: DeckRenderable; children?: DeckRenderable }) {
  return (
    <html lang="ja">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{props.title}</title>
        {props.head}
        <style id="hono-css">{samplePageStyle}</style>
      </head>
      <body>
        <a class="sample-skip" href="#main-content">
          本文へ移動
        </a>
        <main data-sample-layout={props.layout}>
          <header class="sample-page-header">
            <a class="sample-page-brand" href="/" aria-label="Hono Decks Basic home">
              <span aria-hidden="true">H</span>
              <strong>Hono Decks / Basic</strong>
            </a>
            <nav aria-label="Sample">
              <a href="/decks">Deck lab</a>
              <a href="/decks/sample/about">Details</a>
            </nav>
          </header>
          <div id="main-content">{props.children}</div>
          <footer class="sample-page-footer">
            <p>Compiled at build time. Served from the edge.</p>
            <a href="https://github.com/ts-76/hono-decks">View source ↗</a>
          </footer>
        </main>
      </body>
    </html>
  );
}

const samplePageStyle = `
:root {
  color-scheme: dark;
  --sample-ink: #111216;
  --sample-copy: #fff8f3;
  --sample-muted: #cfc3bc;
  --sample-line: rgba(255, 248, 243, .18);
  --sample-accent: #ff6b2c;
  --sample-accent-soft: #ff9a6e;
  --sample-content: 1240px;
  background: var(--sample-ink);
  color: var(--sample-copy);
  font-family: "Avenir Next", "Hiragino Sans", "Yu Gothic", ui-sans-serif, system-ui, sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}
* { box-sizing: border-box; }
body { margin: 0; min-width: 320px; min-height: 100vh; overflow-x: clip; background: var(--sample-ink); color: var(--sample-copy); }
a { color: inherit; }
:focus-visible { outline: 3px solid var(--sample-accent); outline-offset: 4px; }
.sample-skip { position: fixed; z-index: 20; top: 12px; left: 12px; translate: 0 -180%; background: var(--sample-copy); padding: 10px 14px; color: var(--sample-ink); font-weight: 720; text-decoration: none; }
.sample-skip:focus { translate: 0; }
[data-sample-layout] { min-height: 100vh; }
.sample-page-header { display: flex; width: min(var(--sample-content), calc(100% - 48px)); min-height: 82px; align-items: center; justify-content: space-between; gap: 24px; margin: 0 auto; border-bottom: 1px solid var(--sample-line); }
.sample-page-brand { display: inline-flex; align-items: center; gap: 11px; text-decoration: none; }
.sample-page-brand span { display: grid; width: 36px; height: 36px; place-items: center; background: var(--sample-accent); color: var(--sample-ink); font-size: 1.05rem; font-weight: 850; transform: rotate(-4deg); }
.sample-page-brand strong { font-size: .93rem; letter-spacing: -.02em; }
.sample-page-header nav { display: flex; gap: 28px; font-size: .82rem; font-weight: 680; }
.sample-page-header nav a { padding: 30px 0; text-decoration: none; }
.sample-page-header nav a:hover { color: var(--sample-accent-soft); }
.sample-home-hero { display: grid; width: min(var(--sample-content), calc(100% - 48px)); min-height: 640px; grid-template-columns: minmax(0, 1.25fr) minmax(320px, .75fr); gap: clamp(48px, 8vw, 120px); align-items: end; margin: 0 auto; padding: clamp(96px, 12vw, 164px) 0 88px; }
.sample-home-intro { margin: 0 0 24px; color: var(--sample-accent-soft); font-size: .84rem; font-weight: 720; }
.sample-home-hero h1 { max-width: 11ch; margin: 0; font-size: clamp(3.8rem, 7.4vw, 6rem); letter-spacing: -.04em; line-height: .9; text-wrap: balance; }
.sample-home-hero h1 span { color: var(--sample-accent); }
.sample-home-summary > p { max-width: 38ch; margin: 0; color: var(--sample-muted); font-size: clamp(1.02rem, 1.6vw, 1.2rem); line-height: 1.7; text-wrap: pretty; }
.sample-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 30px; padding: 0; }
.sample-actions a { display: inline-flex; min-height: 46px; align-items: center; justify-content: center; gap: 18px; border: 1px solid currentColor; padding: 0 16px; font-size: .8rem; font-weight: 720; text-decoration: none; transition: background-color 160ms ease, color 160ms ease, translate 180ms cubic-bezier(.22, 1, .36, 1); }
.sample-actions a.primary { border-color: var(--sample-accent); background: var(--sample-accent); color: var(--sample-ink); }
.sample-actions a:hover { translate: 0 -2px; background: var(--sample-copy); color: var(--sample-ink); }
.sample-home-decks { background: #f6f3f1; padding: clamp(78px, 9vw, 132px) max(24px, calc((100vw - var(--sample-content)) / 2)); color: var(--sample-ink); }
.sample-home-decks > header { display: flex; align-items: end; justify-content: space-between; gap: 32px; margin-bottom: 52px; }
.sample-home-decks h2 { margin: 0; font-size: clamp(2.8rem, 5.5vw, 4.8rem); letter-spacing: -.04em; line-height: .94; }
.sample-home-decks header p { max-width: 38ch; margin: 0; color: #555257; line-height: 1.72; text-wrap: pretty; }
.sample-home-decks ul { margin: 0; border-top: 1px solid var(--sample-ink); padding: 0; list-style: none; }
.sample-home-decks li { border-bottom: 1px solid #bbb5b1; }
.sample-home-decks li a { display: grid; grid-template-columns: minmax(180px, .7fr) minmax(0, 1.3fr) auto; gap: 32px; align-items: center; min-height: 112px; text-decoration: none; transition: background-color 160ms ease, translate 180ms cubic-bezier(.22, 1, .36, 1); }
.sample-home-decks li a:hover { translate: 8px 0; background: #ede8e4; }
.sample-home-decks li span { font-size: clamp(1.35rem, 2.4vw, 2rem); font-weight: 760; letter-spacing: -.035em; }
.sample-home-decks li small { color: #555257; font-size: .86rem; line-height: 1.5; }
.sample-home-decks li strong { color: var(--sample-accent); font-size: 1.3rem; }
.sample-home-system { display: grid; grid-template-columns: minmax(280px, .8fr) minmax(0, 1.2fr); gap: clamp(44px, 8vw, 110px); background: var(--sample-accent); padding: clamp(72px, 9vw, 120px) max(24px, calc((100vw - var(--sample-content)) / 2)); color: var(--sample-ink); }
.sample-home-system h2 { margin: 0; font-size: clamp(2.6rem, 5vw, 4.5rem); letter-spacing: -.04em; line-height: .91; }
.sample-home-system div { align-self: end; }
.sample-home-system p { max-width: 54ch; margin: 0; font-size: clamp(1.05rem, 1.8vw, 1.28rem); line-height: 1.75; text-wrap: pretty; }
.sample-home-system code { display: inline-block; margin-top: 28px; background: rgba(17, 18, 22, .13); padding: 7px 10px; color: var(--sample-ink); font-size: .76rem; }
.sample-page-section { width: min(var(--sample-content), calc(100% - 48px)); margin: 64px auto 0; background: #f6f3f1; padding: clamp(28px, 5vw, 60px); color: var(--sample-ink); }
.sample-page-section + .sample-page-section { margin-top: 24px; }
.sample-page-section h1, .sample-page-section h2 { margin: 0 0 16px; letter-spacing: -.035em; }
.sample-page-section h1 { font-size: clamp(2.5rem, 5vw, 4.5rem); line-height: .94; }
.sample-page-section h2 { font-size: clamp(1.8rem, 3vw, 2.8rem); }
.sample-kicker { margin: 0 0 12px; color: #b53e0e; font-size: .82rem; font-weight: 720; }
.sample-page-section .sample-actions a { color: var(--sample-ink); }
.sample-page-section .sample-actions a:hover { background: var(--sample-ink); color: var(--sample-copy); }
.sample-meta-list { display: grid; gap: 8px; margin-top: 30px; }
.sample-meta-list div { display: grid; grid-template-columns: 90px minmax(0, 1fr); gap: 12px; border-bottom: 1px solid #bbb5b1; padding: 10px 0; }
.sample-meta-list dt { color: #5c5855; }
.sample-meta-list dd { margin: 0; overflow-wrap: anywhere; }
.sample-toc { display: grid; gap: 8px; padding-left: 1.25rem; }
.sample-toc span { display: inline-flex; min-width: 2rem; color: #5c5855; }
.sample-page-footer { display: flex; width: min(var(--sample-content), calc(100% - 48px)); min-height: 116px; align-items: center; justify-content: space-between; gap: 24px; margin: 0 auto; color: #aaa09a; font-size: .8rem; }
.sample-page-footer a { color: var(--sample-copy); font-weight: 720; text-decoration: none; }
@media (max-width: 820px) {
  .sample-home-hero, .sample-home-system { grid-template-columns: 1fr; }
  .sample-home-hero { min-height: 0; padding: 100px 0 72px; }
  .sample-home-decks > header { align-items: start; flex-direction: column; }
  .sample-home-decks li a { grid-template-columns: 1fr auto; gap: 10px 20px; padding: 24px 0; }
  .sample-home-decks li small { grid-column: 1; }
  .sample-home-decks li strong { grid-column: 2; grid-row: 1 / 3; }
}
@media (max-width: 560px) {
  .sample-page-header, .sample-home-hero, .sample-page-section, .sample-page-footer { width: min(var(--sample-content), calc(100% - 32px)); }
  .sample-page-header nav { gap: 16px; }
  .sample-page-header nav a:last-child { display: none; }
  .sample-home-hero h1 { font-size: clamp(3.2rem, 16vw, 4.6rem); }
  .sample-home-decks, .sample-home-system { padding-right: 16px; padding-left: 16px; }
  .sample-page-footer { align-items: flex-start; flex-direction: column; justify-content: center; }
}
@media (prefers-reduced-motion: reduce) {
  .sample-page-brand span { transform: none; }
  .sample-actions a, .sample-home-decks li a { transition: none; }
  .sample-actions a:hover, .sample-home-decks li a:hover { translate: none; }
}
`;

const basicDeckIndexStyle = `
:root {
  color-scheme: dark;
  --deck-index-ink: #111216;
  --deck-index-surface: #18191d;
  --deck-index-raised: #202126;
  --deck-index-copy: #fff8f3;
  --deck-index-muted: #cfc3bc;
  --deck-index-line: rgba(255, 248, 243, .18);
  --deck-index-accent: #ff6b2c;
  --deck-index-accent-soft: #ff9a6e;
  --deck-index-content: 1240px;
  background: var(--deck-index-ink);
  color: var(--deck-index-copy);
  font-family: "Avenir Next", "Hiragino Sans", "Yu Gothic", ui-sans-serif, system-ui, sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; min-width: 320px; overflow-x: clip; background: var(--deck-index-ink); color: var(--deck-index-copy); }
a { color: inherit; }
:focus-visible { outline: 3px solid var(--deck-index-accent); outline-offset: 4px; }
.deck-index-skip { position: fixed; z-index: 20; top: 12px; left: 12px; translate: 0 -180%; background: var(--deck-index-copy); padding: 10px 14px; color: var(--deck-index-ink); font-weight: 700; text-decoration: none; }
.deck-index-skip:focus { translate: 0; }
.deck-index-header { display: flex; width: min(var(--deck-index-content), calc(100% - 48px)); min-height: 82px; align-items: center; justify-content: space-between; gap: 24px; margin: 0 auto; border-bottom: 1px solid var(--deck-index-line); }
.deck-index-brand { display: inline-flex; align-items: center; gap: 11px; text-decoration: none; }
.deck-index-brand span { display: grid; width: 36px; height: 36px; place-items: center; background: var(--deck-index-accent); color: var(--deck-index-ink); font-size: 1.05rem; font-weight: 850; transform: rotate(-4deg); }
.deck-index-brand strong { font-size: .93rem; letter-spacing: -.02em; }
.deck-index-header nav { display: flex; gap: 28px; font-size: .82rem; font-weight: 680; }
.deck-index-header nav a { padding: 30px 0; text-decoration: none; }
.deck-index-header nav a:hover { color: var(--deck-index-accent-soft); }
.deck-index-main { overflow: hidden; }
.deck-index-hero { display: grid; width: min(var(--deck-index-content), calc(100% - 48px)); min-height: 650px; grid-template-columns: minmax(0, 1.3fr) minmax(320px, .7fr); gap: clamp(48px, 8vw, 120px); align-items: end; margin: 0 auto; padding: clamp(100px, 12vw, 174px) 0 88px; }
.deck-index-intro { margin: 0 0 24px; color: var(--deck-index-accent-soft); font-size: .84rem; font-weight: 720; }
.deck-index-hero h1 { max-width: 10ch; margin: 0; font-size: clamp(3.8rem, 7.4vw, 6rem); letter-spacing: -.04em; line-height: .9; text-wrap: balance; }
.deck-index-hero h1 span { color: var(--deck-index-accent); }
.deck-index-summary { padding-bottom: 3px; }
.deck-index-summary > p { max-width: 38ch; margin: 0; color: var(--deck-index-muted); font-size: clamp(1.02rem, 1.6vw, 1.2rem); line-height: 1.7; text-wrap: pretty; }
.deck-index-summary dl { margin: 30px 0 0; border-top: 1px solid var(--deck-index-line); }
.deck-index-summary dl div { display: grid; grid-template-columns: 92px minmax(0, 1fr); gap: 18px; padding: 13px 0; border-bottom: 1px solid var(--deck-index-line); }
.deck-index-summary dt { color: #a99e98; font-size: .72rem; }
.deck-index-summary dd { margin: 0; font-size: .82rem; font-weight: 680; }
.deck-index-hero-link { display: inline-flex; min-height: 48px; align-items: center; justify-content: space-between; gap: 20px; margin-top: 30px; background: var(--deck-index-accent); padding: 0 18px; color: var(--deck-index-ink); font-size: .82rem; font-weight: 780; text-decoration: none; transition: translate 180ms cubic-bezier(.22, 1, .36, 1); }
.deck-index-hero-link:hover { translate: 4px 0; }
.deck-catalog { background: #f6f3f1; padding: clamp(78px, 9vw, 132px) max(24px, calc((100vw - var(--deck-index-content)) / 2)); color: var(--deck-index-ink); }
.deck-catalog-heading { display: flex; align-items: end; justify-content: space-between; gap: 32px; margin-bottom: 58px; }
.deck-catalog-heading h2 { margin: 0; font-size: clamp(2.8rem, 5.5vw, 4.8rem); letter-spacing: -.04em; line-height: .94; text-wrap: balance; }
.deck-catalog-heading p { max-width: 38ch; margin: 0; color: #555257; line-height: 1.72; text-wrap: pretty; }
.deck-showcase-list { border-top: 1px solid var(--deck-index-ink); }
.deck-showcase { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(300px, .8fr); gap: clamp(32px, 5vw, 70px); align-items: center; padding: clamp(42px, 6vw, 78px) 0; border-bottom: 1px solid #bab5b1; }
.deck-showcase:nth-child(even) .deck-showcase-preview { order: 2; }
.deck-showcase:nth-child(even) .deck-showcase-copy { padding-left: clamp(0px, 2vw, 24px); }
.deck-showcase-preview { position: relative; display: grid; min-width: 0; aspect-ratio: 16 / 9; grid-template-rows: auto 1fr auto; overflow: hidden; background: var(--deck-index-ink); padding: clamp(20px, 4vw, 48px); color: var(--deck-index-copy); text-decoration: none; transition: translate 200ms cubic-bezier(.22, 1, .36, 1); }
.deck-showcase-preview:hover { translate: 0 -4px; }
.deck-showcase-preview > span, .deck-showcase-preview > strong, .deck-showcase-preview > small { position: relative; z-index: 1; }
.deck-poster-label { color: var(--deck-index-accent-soft); font-size: clamp(.65rem, 1.2vw, .82rem); font-weight: 720; }
.deck-showcase-preview > strong { max-width: 8ch; align-self: end; font-size: clamp(2.1rem, 4.7vw, 4.8rem); letter-spacing: -.04em; line-height: .86; overflow-wrap: anywhere; text-wrap: balance; }
.deck-showcase-preview > small { justify-self: end; margin-top: 20px; color: #d8cec8; font-size: .72rem; font-weight: 680; }
.deck-poster-art { position: absolute !important; z-index: 0 !important; inset: 0; pointer-events: none; }
.deck-showcase--sample .deck-poster-art b { position: absolute; right: 8%; top: 22%; display: grid; width: 25%; aspect-ratio: 1; place-items: center; background: var(--deck-index-accent); color: var(--deck-index-ink); font-size: clamp(3rem, 8vw, 7rem); font-weight: 850; transform: rotate(4deg); }
.deck-showcase--code .deck-showcase-preview { border: 8px solid var(--deck-index-accent); }
.deck-showcase--code .deck-poster-art code { position: absolute; right: 7%; top: 42%; width: 48%; background: #202126; padding: 18px; color: #ffb08f; font-size: clamp(.62rem, 1.4vw, 1rem); }
.deck-showcase--media .deck-showcase-preview { background: #07111f; }
.deck-showcase--media .deck-poster-label { color: #70ddff; }
.deck-showcase--media .deck-poster-art { position: absolute; right: 7%; top: 24%; left: auto; width: 44%; height: 52%; background: #1fb9ab; }
.deck-showcase--media .deck-poster-art i { position: absolute; display: block; }
.deck-showcase--media .deck-poster-art i:nth-child(1) { top: 18%; left: 13%; width: 20%; aspect-ratio: 1; border-radius: 50%; background: #fff1bd; }
.deck-showcase--media .deck-poster-art i:nth-child(2) { right: 10%; bottom: 14%; width: 62%; height: 38%; background: #085a62; clip-path: polygon(0 100%, 38% 16%, 58% 52%, 76% 28%, 100% 100%); }
.deck-showcase--media .deck-poster-art i:nth-child(3) { right: 5%; bottom: -30%; width: 50%; aspect-ratio: 1; border: 1px solid rgba(112, 221, 255, .32); border-radius: 50%; }
.deck-showcase--motion .deck-showcase-preview { border-bottom: 8px solid var(--deck-index-accent); }
.deck-showcase--motion .deck-poster-art i { position: absolute; right: 10%; top: 22%; display: block; width: 30%; aspect-ratio: 1; border: 1px solid rgba(255, 107, 44, .42); border-radius: 50%; }
.deck-showcase--motion .deck-poster-art i::after { position: absolute; top: 50%; left: -5px; width: 10px; height: 10px; border-radius: 50%; background: var(--deck-index-accent); box-shadow: 0 0 8px rgba(255, 107, 44, .78); content: ""; translate: 0 -50%; }
.deck-showcase-copy { min-width: 0; }
.deck-showcase-meta { display: flex; flex-wrap: wrap; gap: 8px 22px; color: #625e5b; font-size: .74rem; }
.deck-showcase-copy h3 { max-width: 12ch; margin: 22px 0 16px; font-size: clamp(2.25rem, 4.1vw, 4rem); letter-spacing: -.04em; line-height: .94; overflow-wrap: anywhere; text-wrap: balance; }
.deck-showcase-copy > p { max-width: 46ch; margin: 0; color: #555257; line-height: 1.72; text-wrap: pretty; }
.deck-showcase-tags { display: flex; flex-wrap: wrap; gap: 8px; margin: 24px 0 0; padding: 0; list-style: none; }
.deck-showcase-tags li { border: 1px solid #bab5b1; border-radius: 999px; padding: 6px 10px; font-size: .7rem; }
.deck-showcase-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 30px; }
.deck-showcase-actions a { display: inline-flex; min-height: 44px; align-items: center; justify-content: center; gap: 14px; border: 1px solid var(--deck-index-ink); padding: 0 15px; font-size: .78rem; font-weight: 720; text-decoration: none; transition: background-color 160ms ease, color 160ms ease, translate 180ms cubic-bezier(.22, 1, .36, 1); }
.deck-showcase-actions a.primary { border-color: var(--deck-index-accent); background: var(--deck-index-accent); }
.deck-showcase-actions a:hover { translate: 0 -2px; background: var(--deck-index-ink); color: var(--deck-index-copy); }
.deck-index-footer { display: flex; width: min(var(--deck-index-content), calc(100% - 48px)); min-height: 120px; align-items: center; justify-content: space-between; gap: 24px; margin: 0 auto; color: #aaa09a; font-size: .8rem; }
.deck-index-footer a { color: var(--deck-index-copy); font-weight: 700; text-decoration: none; }
@media (max-width: 820px) {
  .deck-index-hero, .deck-showcase { grid-template-columns: 1fr; }
  .deck-index-hero { min-height: 0; padding: 100px 0 72px; }
  .deck-catalog-heading { align-items: start; flex-direction: column; }
  .deck-showcase:nth-child(even) .deck-showcase-preview { order: 0; }
  .deck-showcase:nth-child(even) .deck-showcase-copy { padding-left: 0; }
}
@media (max-width: 560px) {
  .deck-index-header, .deck-index-hero, .deck-index-footer { width: min(var(--deck-index-content), calc(100% - 32px)); }
  .deck-index-header nav { gap: 16px; }
  .deck-index-header nav a:first-child { display: none; }
  .deck-index-hero h1 { font-size: clamp(3.25rem, 16vw, 4.7rem); }
  .deck-index-summary dl div { grid-template-columns: 80px minmax(0, 1fr); }
  .deck-catalog { padding-right: 16px; padding-left: 16px; }
  .deck-showcase { gap: 28px; }
  .deck-index-footer { align-items: flex-start; flex-direction: column; justify-content: center; }
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .deck-index-brand span { transform: none; }
  .deck-index-hero-link, .deck-showcase-preview, .deck-showcase-actions a { transition: none; }
  .deck-index-hero-link:hover, .deck-showcase-preview:hover, .deck-showcase-actions a:hover { translate: none; }
  .deck-showcase--sample .deck-poster-art b { transform: none; }
}
`;

const sampleViewerStyle = `
:root {
  color-scheme: light;
  background: oklch(94% 0 0);
  color: #111827;
}

[data-hono-decks-viewer] {
  background: linear-gradient(145deg, oklch(99% 0 0) 0%, oklch(94% 0 0) 58%, oklch(88% 0 0) 100%);
  color: #111827;
  padding: 16px;
}

.sample-viewer-controls {
  padding: 0;
}

.hono-decks-viewer-controls .sample-viewer-control {
  border: 1px solid #64748b;
  border-radius: 8px;
  background: #ffffff;
  color: #111827;
  padding: 8px 10px;
  text-decoration: none;
}

.hono-decks-viewer-controls .sample-viewer-control:is(a, button) {
  cursor: pointer;
}

.hono-decks-viewer-controls .sample-viewer-control:is(a, button):hover {
  background: #f1f5f9;
}

.hono-decks-viewer-controls .sample-viewer-control:is(a, button):active {
  background: #e2e8f0;
}

.hono-decks-viewer-controls .sample-viewer-control:is(a, button):focus-visible {
  outline: 3px solid #0369a1;
  outline-offset: 2px;
}

.hono-decks-viewer-controls .sample-viewer-control:is(a, button) * {
  pointer-events: none;
  cursor: pointer;
}
`;

export function renderSampleViewerHead() {
  return <style id="hono-css">{sampleViewerStyle}</style>;
}
