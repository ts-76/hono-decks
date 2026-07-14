/** @jsxImportSource hono/jsx */

import {
  type CompiledDeck,
  type DeckEntry,
  type DeckPageMeta,
  type DeckRenderable,
  type DeckTocItem,
} from "hono-decks";

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
          <meta property="og:url" content={input.meta.canonicalPath} />
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

function SampleLayout(props: {
  title: string;
  layout: string;
  head?: DeckRenderable;
  children?: DeckRenderable;
}) {
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
:root { color-scheme: light; background: oklch(94% 0 0); color: #111827; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
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
