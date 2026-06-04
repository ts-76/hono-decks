import type { CompiledDeck, CompiledSlide } from "./deck";

export function renderCompiledDeck(deck: CompiledDeck): string {
  return `<main class="hono-slides-deck" data-deck-slug="${escapeHtml(deck.slug)}">${deck.slides
    .map(renderCompiledSlide)
    .join("\n")}</main>`;
}

export function renderCompiledSlide(slide: CompiledSlide): string {
  const layout = slide.meta.layout ?? "default";
  const classes = ["slide", `layout-${safeClass(layout)}`, slide.meta.className ? safeClass(slide.meta.className) : ""]
    .filter(Boolean)
    .join(" ");
  const notes = slide.notes ?? slide.meta.notes;
  const notesHtml = notes ? `<aside class="speaker-notes" hidden>${escapeHtml(notes)}</aside>` : "";

  return `<section class="${classes}" data-slide-index="${slide.index}"${slide.meta.title ? ` aria-label="${escapeHtml(slide.meta.title)}"` : ""}>${slide.html}${notesHtml}</section>`;
}

export function renderCompiledDeckPage(input: { deck: CompiledDeck; mountPath: string; style?: string }): string {
  const { deck } = input;
  const warnings = deck.warnings.length
    ? `<aside class="hono-slides-warnings">${deck.warnings.map((warning) => `<p>${escapeHtml(warning.message)}</p>`).join("")}</aside>`
    : "";

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(deck.meta.title ?? deck.slug)}</title>
  <style>${basePresentationStyle()}${input.style ?? ""}</style>
</head>
<body>
  ${warnings}
  ${renderCompiledDeck(deck)}
  ${renderPresentationControls(deck)}
</body>
</html>`;
}

function renderPresentationControls(deck: CompiledDeck): string {
  return `<nav class="hono-slides-controls" data-hono-slides-controls aria-label="Presentation controls">
    <button type="button" data-action="previous" aria-label="Previous slide">Prev</button>
    <span data-slide-position>1 / ${deck.slides.length}</span>
    <button type="button" data-action="next" aria-label="Next slide">Next</button>
    <button type="button" data-action="fullscreen" aria-label="Fullscreen">Full</button>
    <button type="button" data-action="presenter" aria-label="Presenter mode">Presenter</button>
    <button type="button" data-action="overview" aria-label="Overview">Overview</button>
    <span data-timer>00:00</span>
  </nav>`;
}

function basePresentationStyle(): string {
  return `
:root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0b1020;color:#eef2ff}
body{margin:0}
.hono-slides-deck{display:grid;gap:1rem;padding:1rem}
.slide{aspect-ratio:16/9;border:1px solid rgba(255,255,255,.13);border-radius:24px;padding:clamp(1.2rem,3vw,3rem);background:linear-gradient(145deg,rgba(255,255,255,.12),rgba(255,255,255,.035));overflow:hidden}
.slide.layout-cover,.slide.layout-statement{display:flex;flex-direction:column;justify-content:center}
.hono-slides-controls{position:sticky;bottom:0;display:flex;gap:.5rem;align-items:center;padding:.75rem;background:rgba(11,16,32,.92);backdrop-filter:blur(12px)}
.hono-slides-controls button{border:1px solid rgba(255,255,255,.2);border-radius:8px;background:rgba(255,255,255,.08);color:inherit;padding:.45rem .7rem}
.hono-slides-warnings{margin:1rem;padding:.75rem;border-radius:14px;background:rgba(255,193,7,.12);color:#ffe59b}`;
}

function safeClass(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
