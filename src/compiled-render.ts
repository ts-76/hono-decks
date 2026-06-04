import type { AssetRef, CompiledDeck, CompiledSlide } from "./deck";

export function renderCompiledDeck(deck: CompiledDeck): string {
  return `<main class="hono-slides-deck" data-deck-slug="${escapeHtml(deck.slug)}">${deck.slides
    .map((slide) => renderCompiledSlide(slide, deck.assets))
    .join("\n")}</main>`;
}

export function renderCompiledSlide(slide: CompiledSlide, assets: AssetRef[] = []): string {
  const layout = slide.meta.layout ?? "default";
  const classes = ["slide", `layout-${safeClass(layout)}`, slide.meta.className ? safeClass(slide.meta.className) : ""]
    .filter(Boolean)
    .join(" ");
  const notes = slide.notes ?? slide.meta.notes;
  const notesHtml = notes ? `<aside class="speaker-notes" hidden>${escapeHtml(notes)}</aside>` : "";
  const html = rewriteLocalAssetUrls(slide.html, assets);
  const style = slide.meta.background ? ` style="${escapeHtml(backgroundStyle(slide.meta.background, assets))}"` : "";
  const transition = slide.meta.transition ? ` data-transition="${escapeHtml(safeClass(slide.meta.transition))}"` : "";

  return `<section class="${classes}" data-slide-index="${slide.index}"${slide.meta.title ? ` aria-label="${escapeHtml(slide.meta.title)}"` : ""}${transition}${style}>${html}${notesHtml}</section>`;
}

export function renderCompiledDeckPage(input: {
  deck: CompiledDeck;
  mountPath: string;
  style?: string;
  liveReloadPath?: string;
}): string {
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
  ${renderPresentationScript()}
  ${input.liveReloadPath ? renderLiveReloadScript(input.liveReloadPath) : ""}
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
body:not([data-overview-mode]) .slide[hidden]{display:none}
body[data-overview-mode] .hono-slides-deck{grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
body[data-overview-mode] .slide{cursor:pointer}
body[data-presenter-mode] .speaker-notes{display:block;margin-top:1rem;padding:.75rem;border-radius:8px;background:rgba(255,255,255,.08)}
.hono-slides-controls{position:sticky;bottom:0;display:flex;gap:.5rem;align-items:center;padding:.75rem;background:rgba(11,16,32,.92);backdrop-filter:blur(12px)}
.hono-slides-controls button{border:1px solid rgba(255,255,255,.2);border-radius:8px;background:rgba(255,255,255,.08);color:inherit;padding:.45rem .7rem}
.hono-slides-warnings{margin:1rem;padding:.75rem;border-radius:14px;background:rgba(255,193,7,.12);color:#ffe59b}`;
}

function renderPresentationScript(): string {
  return `<script>
(() => {
  const slides = Array.from(document.querySelectorAll(".slide"));
  const position = document.querySelector("[data-slide-position]");
  const timer = document.querySelector("[data-timer]");
  const startedAt = Date.now();
  let index = 0;

  function show(nextIndex) {
    index = Math.max(0, Math.min(slides.length - 1, nextIndex));
    if (!document.body.hasAttribute("data-overview-mode")) {
      slides.forEach((slide, slideIndex) => { slide.hidden = slideIndex !== index; });
    }
    if (position) position.textContent = String(index + 1) + " / " + String(slides.length);
  }

  function toggleOverview() {
    const enabled = document.body.toggleAttribute("data-overview-mode");
    slides.forEach((slide) => { slide.hidden = false; });
    if (!enabled) show(index);
  }

  function togglePresenter() {
    const enabled = document.body.toggleAttribute("data-presenter-mode");
    document.querySelectorAll(".speaker-notes").forEach((note) => { note.hidden = !enabled; });
  }

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen?.();
      return;
    }
    await document.documentElement.requestFullscreen?.();
  }

  document.querySelector("[data-action='previous']")?.addEventListener("click", () => show(index - 1));
  document.querySelector("[data-action='next']")?.addEventListener("click", () => show(index + 1));
  document.querySelector("[data-action='fullscreen']")?.addEventListener("click", () => { void toggleFullscreen(); });
  document.querySelector("[data-action='presenter']")?.addEventListener("click", togglePresenter);
  document.querySelector("[data-action='overview']")?.addEventListener("click", toggleOverview);
  slides.forEach((slide, slideIndex) => {
    slide.addEventListener("click", () => {
      if (!document.body.hasAttribute("data-overview-mode")) return;
      document.body.removeAttribute("data-overview-mode");
      show(slideIndex);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight" || event.key === " ") show(index + 1);
    if (event.key === "ArrowLeft") show(index - 1);
    if (event.key === "f") void toggleFullscreen();
    if (event.key === "p") togglePresenter();
    if (event.key === "o") toggleOverview();
  });

  setInterval(() => {
    if (!timer) return;
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const seconds = String(elapsed % 60).padStart(2, "0");
    timer.textContent = minutes + ":" + seconds;
  }, 1000);

  show(0);
})();
</script>`;
}

function renderLiveReloadScript(eventsPath: string): string {
  return `<script>
(() => {
  try {
    const events = new EventSource(${JSON.stringify(eventsPath)});
    events.addEventListener("deck:updated", (event) => {
      if (event.type === "deck:updated") location.reload();
    });
  } catch {}
})();
</script>`;
}

function safeClass(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
}

function rewriteLocalAssetUrls(html: string, assets: AssetRef[]): string {
  const localAssets = assets.filter((asset) => asset.type === "local");
  if (localAssets.length === 0) return html;

  return html
    .replace(/\b(src|href)=["']([^"']+)["']/g, (match, attr: string, value: string) => {
      const asset = findAssetForHtmlUrl(localAssets, value);
      return asset ? `${attr}="${escapeHtml(asset.publicPath)}"` : match;
    })
    .replace(/<dd>([^<]+)<\/dd>/g, (match, value: string) => {
      const asset = findAssetForHtmlUrl(localAssets, decodeHtml(value));
      return asset ? `<dd>${escapeHtml(asset.publicPath)}</dd>` : match;
    });
}

function backgroundStyle(value: string, assets: AssetRef[]): string {
  const asset = findAssetForHtmlUrl(assets.filter((candidate) => candidate.type === "local"), value);
  const url = asset?.publicPath ?? value;
  return `background-image:url("${escapeCssUrl(url)}")`;
}

function findAssetForHtmlUrl(assets: AssetRef[], value: string): AssetRef | undefined {
  const normalized = decodeURIComponent(value).replace(/^\.?\//, "");
  return assets.find((asset) => {
    const assetPath = localAssetRelativePath(asset);
    return normalized === assetPath || normalized === `assets/${assetPath}`;
  });
}

function escapeCssUrl(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function localAssetRelativePath(asset: AssetRef): string {
  const marker = "/assets/";
  const normalized = asset.sourcePath.replaceAll("\\", "/");
  const markerIndex = normalized.indexOf(marker);
  return markerIndex === -1 ? (normalized.split("/").at(-1) ?? normalized) : normalized.slice(markerIndex + marker.length);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function decodeHtml(value: string): string {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}
