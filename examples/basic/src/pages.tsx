/** @jsxImportSource hono/jsx */

import {
  type CompiledDeck,
  type DeckEntry,
  type DeckPageMeta,
  type DeckRenderable,
  type DeckTocItem,
  type DeckViewerParts,
} from "@hono/decks";

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

export function renderDeckDetailsPage(input: {
  deck: CompiledDeck;
  meta: DeckPageMeta;
  toc: DeckTocItem[];
}) {
  return (
    <SampleLayout title={`${input.meta.title} - Details`} layout="deck-details">
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
          <a href={input.meta.canonicalPath}>Open viewer</a>
          <a href={input.meta.renderPath}>Open render page</a>
          <a href={input.meta.printPath}>Open print page</a>
          <a href={`${input.meta.canonicalPath}/embed`}>Embed view</a>
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

export function renderDeckEmbedPage(input: {
  meta: DeckPageMeta;
  viewer: DeckViewerParts;
}) {
  return (
    <SampleLayout title={`${input.meta.title} - Embed`} layout="deck-embed">
      <section class="sample-embed">
        <header>
          <p class="sample-kicker">Embeddable viewer</p>
          <h1>{input.meta.title}</h1>
        </header>
        {input.viewer.frame}
      </section>
    </SampleLayout>
  );
}

function SampleLayout(props: {
  title: string;
  layout: string;
  children?: DeckRenderable;
}) {
  return (
    <html lang="ja">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{props.title}</title>
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
:root { color-scheme: dark; background: #050816; color: #eef2ff; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
body { margin: 0; min-height: 100vh; background: #050816; }
a { color: inherit; }
[data-sample-layout] { width: min(1120px, calc(100vw - 32px)); margin: 0 auto; padding: 32px 0; }
.sample-page-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
.sample-page-header nav { display: flex; gap: 12px; }
.sample-page-section { margin: 0 0 24px; padding: 20px; border: 1px solid rgba(255,255,255,.14); border-radius: 8px; background: rgba(255,255,255,.06); }
.sample-page-section h1, .sample-page-section h2, .sample-embed h1 { margin: 0 0 12px; }
.sample-kicker { margin: 0 0 8px; color: #8bd3ff; font-size: .85rem; text-transform: uppercase; }
.sample-actions, .sample-link-list, .sample-link-list li { display: flex; flex-wrap: wrap; gap: 10px; padding: 0; list-style: none; }
.sample-actions a, .sample-link-list a { display: inline-flex; padding: 8px 10px; border: 1px solid rgba(255,255,255,.18); border-radius: 8px; text-decoration: none; }
.sample-meta-list { display: grid; gap: 8px; }
.sample-meta-list div { display: grid; grid-template-columns: 90px minmax(0, 1fr); gap: 12px; }
.sample-meta-list dt { color: #93a4bd; }
.sample-meta-list dd { margin: 0; overflow-wrap: anywhere; }
.sample-toc { display: grid; gap: 8px; padding-left: 1.25rem; }
.sample-toc span { display: inline-flex; min-width: 2rem; color: #93a4bd; }
.sample-embed { display: grid; gap: 16px; }
.sample-embed .hono-decks-viewer-stage { display: block; width: min(100%, 960px); }
.sample-embed .hono-decks-viewport { width: 100%; aspect-ratio: 16 / 9; overflow: hidden; }
.sample-embed .hono-decks-frame-stage { width: 1920px; height: 1080px; transform: scale(.5); transform-origin: top left; }
.sample-embed iframe { width: 1920px; height: 1080px; border: 0; }
`;

const sampleViewerStyle = `
[data-hono-decks-viewer] {
  background: radial-gradient(circle at top, #1e2b5c, #050816 62%);
  padding: 16px;
}

.hono-decks-viewer-controls {
  padding: 8px 10px;
  border-radius: 999px;
  background: rgba(5, 8, 22, .72);
  backdrop-filter: blur(12px);
}

.hono-decks-viewer-controls button {
  border: 1px solid rgba(255, 255, 255, .22);
  border-radius: 999px;
  background: rgba(255, 255, 255, .1);
  color: inherit;
  padding: 8px 12px;
  cursor: pointer;
}
`;

export function renderSampleViewerHead() {
  return <style id="hono-css">{sampleViewerStyle}</style>;
}
