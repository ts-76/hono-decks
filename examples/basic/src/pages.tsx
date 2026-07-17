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
      <section class="sample-page-section">
        <p class="sample-kicker">Worker sample</p>
        <h1>Hono Decks Basic</h1>
        <p>Generated deck routes, custom pages, and client islands running on Hono.</p>
        <nav class="sample-actions" aria-label="Primary">
          <a href="/decks">Deck index</a>
          <a href="/decks/sample/about">Sample details</a>
        </nav>
      </section>
      <section class="sample-page-section">
        <h2>Available decks</h2>
        <ul class="sample-link-list">
          {decks.map((deck) => {
            const slug = encodeURIComponent(deck.slug);
            return (
              <li>
                <a href={`/decks/${slug}`}>{deck.title ?? deck.slug}</a>
                <a href={`/decks/${slug}/about`}>Details</a>
              </li>
            );
          })}
        </ul>
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
            <p>各プレビューは実際の deck route です。気になる資料をそのまま閲覧・発表・印刷できます。</p>
          </header>

          <div class="deck-showcase-list">
            {decks.map((deck, index) => {
              const paths = input.paths(deck.slug);
              const title = deck.meta.title ?? deck.slug;
              const tags = deck.meta.tags ?? [];
              return (
                <article class={`deck-showcase deck-showcase--${deck.slug}`}>
                  <div class="deck-showcase-preview">
                    <iframe
                      src={paths.embed}
                      title={`${title} slide preview`}
                      loading={index === 0 ? "eager" : "lazy"}
                      allow="fullscreen"
                    ></iframe>
                  </div>
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
        <main data-sample-layout={props.layout}>
          <header class="sample-page-header">
            <a href="/">Hono Decks Basic</a>
            <nav aria-label="Sample">
              <a href="/decks">Decks</a>
              <a href="/decks/sample/about">Details</a>
            </nav>
          </header>
          {props.children}
        </main>
      </body>
    </html>
  );
}

const samplePageStyle = `
:root { color-scheme: light; background: oklch(94% 0 0); color: #111827; font-family: "Avenir Next", "Hiragino Sans", "Yu Gothic", ui-sans-serif, system-ui, sans-serif; }
body { margin: 0; min-height: 100vh; background: linear-gradient(145deg, oklch(99% 0 0) 0%, oklch(94% 0 0) 58%, oklch(88% 0 0) 100%); background-attachment: fixed; }
a { color: inherit; }
[data-sample-layout] { width: min(1120px, calc(100vw - 32px)); margin: 0 auto; padding: 32px 0; }
.sample-page-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
.sample-page-header nav { display: flex; gap: 12px; }
.sample-page-section { margin: 0 0 24px; padding: 20px; border: 1px solid #94a3b8; border-radius: 8px; background: #ffffff; }
.sample-page-section h1, .sample-page-section h2 { margin: 0 0 12px; }
.sample-kicker { margin: 0 0 8px; color: #075985; font-size: .85rem; text-transform: uppercase; }
.sample-actions, .sample-link-list, .sample-link-list li { display: flex; flex-wrap: wrap; gap: 10px; padding: 0; list-style: none; }
.sample-actions a, .sample-link-list a { display: inline-flex; padding: 8px 10px; border: 1px solid #64748b; border-radius: 8px; background: #ffffff; text-decoration: none; }
.sample-actions a:hover, .sample-link-list a:hover { background: #f1f5f9; }
.sample-actions a:active, .sample-link-list a:active { background: #e2e8f0; }
.sample-page-header a:focus-visible, .sample-actions a:focus-visible, .sample-link-list a:focus-visible { outline: 3px solid #0369a1; outline-offset: 2px; }
.sample-meta-list { display: grid; gap: 8px; }
.sample-meta-list div { display: grid; grid-template-columns: 90px minmax(0, 1fr); gap: 12px; }
.sample-meta-list dt { color: #475569; }
.sample-meta-list dd { margin: 0; overflow-wrap: anywhere; }
.sample-toc { display: grid; gap: 8px; padding-left: 1.25rem; }
.sample-toc span { display: inline-flex; min-width: 2rem; color: #475569; }
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
.deck-showcase-preview { min-width: 0; background: var(--deck-index-ink); }
.deck-showcase-preview iframe { display: block; width: 100%; aspect-ratio: 16 / 9; border: 0; background: var(--deck-index-ink); }
.deck-showcase--code .deck-showcase-preview { border: 8px solid var(--deck-index-accent); }
.deck-showcase--media .deck-showcase-preview { background: #07111f; }
.deck-showcase--motion .deck-showcase-preview { border-bottom: 8px solid var(--deck-index-accent); }
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
  .deck-index-hero-link, .deck-showcase-actions a { transition: none; }
  .deck-index-hero-link:hover, .deck-showcase-actions a:hover { translate: none; }
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
