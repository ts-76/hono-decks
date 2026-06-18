import type { AssetRef, CompiledDeck, CompiledSlide } from "../deck/model";
import { builtInSlideComponents, defineSlideComponents, renderSlideNodes } from "./jsx-renderer";
import type { SlideComponentInput, SlideComponentRegistry } from "./jsx-renderer";

export { defineSlideComponents };
export { builtInSlideComponents };
export type { SlideComponent, SlideComponentDefinition, SlideComponentInput, SlideComponentRegistry } from "./jsx-renderer";

export function renderCompiledDeck(
  deck: CompiledDeck,
  input: {
    components?: SlideComponentRegistry | Record<string, SlideComponentInput>;
  } = {},
): string {
  const components = normalizeComponents(input.components);
  return `<main class="hono-slides-stage hono-slides-deck" data-hono-slides-stage data-deck-slug="${escapeHtml(deck.slug)}">${deck.slides
    .map((slide) => renderCompiledSlide(slide, deck.assets, { components }))
    .join("\n")}</main>`;
}

export function renderCompiledSlide(
  slide: CompiledSlide,
  assets: AssetRef[] = [],
  input: {
    components?: SlideComponentRegistry;
  } = {},
): string {
  const layout = slide.meta.layout ?? "default";
  const classes = ["slide", `layout-${safeClass(layout)}`, slide.meta.className ? safeClass(slide.meta.className) : ""]
    .filter(Boolean)
    .join(" ");
  const notes = slide.notes ?? slide.meta.notes;
  const notesHtml = notes ? `<aside class="speaker-notes" hidden>${escapeHtml(notes)}</aside>` : "";
  const html = slide.nodes?.length
    ? renderSlideNodes(slide.nodes, { components: input.components, assets })
    : rewriteLocalAssetUrls(slide.html, assets);
  const style = slide.meta.background ? ` style="${escapeHtml(backgroundStyle(slide.meta.background, assets))}"` : "";
  const transition = slide.meta.transition ? ` data-transition="${escapeHtml(safeClass(slide.meta.transition))}"` : "";

  return `<section class="${classes}" data-slide-index="${slide.index}"${slide.meta.title ? ` aria-label="${escapeHtml(slide.meta.title)}"` : ""}${transition}${style}>${html}${notesHtml}</section>`;
}

export function renderCompiledDeckPage(input: {
  deck: CompiledDeck;
  mountPath: string;
  style?: string;
  liveReloadPath?: string;
  components?: SlideComponentRegistry | Record<string, SlideComponentInput>;
  clientEntry?: string;
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
  ${renderCompiledDeck(deck, { components: input.components })}
  ${renderPresentationScript()}
  ${input.liveReloadPath ? renderLiveReloadScript(input.liveReloadPath) : ""}
  ${input.clientEntry ? renderClientEntryScript(input.clientEntry) : ""}
</body>
</html>`;
}

function normalizeComponents(
  components: SlideComponentRegistry | Record<string, SlideComponentInput> | undefined,
): SlideComponentRegistry | undefined {
  return {
    ...builtInSlideComponents,
    ...(components ? defineSlideComponents(components) : {}),
  };
}

function basePresentationStyle(): string {
  return `
:root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0b1020;color:#eef2ff;--hono-slides-width:1920px;--hono-slides-height:1080px}
html,body{margin:0;width:var(--hono-slides-width);height:var(--hono-slides-height);overflow:hidden}
.hono-slides-stage{width:var(--hono-slides-width);height:var(--hono-slides-height);overflow:hidden;background:#0b1020;position:relative}
.hono-slides-deck{display:grid;gap:1rem;padding:1rem;width:100%;height:100%;box-sizing:border-box}
.slide{aspect-ratio:16/9;border:1px solid rgba(255,255,255,.13);border-radius:24px;padding:clamp(1.2rem,3vw,3rem);background:linear-gradient(145deg,rgba(255,255,255,.12),rgba(255,255,255,.035));overflow:hidden}
.slide.layout-cover,.slide.layout-statement{display:flex;flex-direction:column;justify-content:center}
.mdx-hero{height:100%;display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,42%);gap:clamp(1rem,3vw,3rem);align-items:center}
.mdx-hero:not(.has-image){grid-template-columns:1fr}
.mdx-hero-copy{min-width:0}
.mdx-hero-eyebrow{margin:0 0 .75rem;color:#8bd3ff;text-transform:uppercase;font-size:.85rem;letter-spacing:0}
.mdx-hero h1{margin:0;font-size:clamp(2.2rem,5vw,5rem);line-height:1.02}
.mdx-hero-subtitle{margin:1rem 0 0;font-size:clamp(1rem,1.8vw,1.5rem);line-height:1.45;color:#cbd5e1}
.mdx-hero-image{width:100%;height:auto;max-height:70vh;object-fit:contain;border-radius:8px}
body:not([data-overview-mode]) .slide[hidden]{display:none}
body[data-overview-mode] .hono-slides-deck{grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
body[data-overview-mode] .slide{cursor:pointer}
body[data-presenter-mode] .speaker-notes{display:block;margin-top:1rem;padding:.75rem;border-radius:8px;background:rgba(255,255,255,.08)}
.hono-slides-warnings{margin:1rem;padding:.75rem;border-radius:14px;background:rgba(255,193,7,.12);color:#ffe59b}`;
}

function renderPresentationScript(): string {
  return `<script>
(() => {
  const slides = Array.from(document.querySelectorAll(".slide"));
  let index = 0;

  function publishState() {
    if (window.parent !== window) window.parent.postMessage({ type: "hono-slides:state", index, slideCount: slides.length }, "*");
  }

  function show(nextIndex) {
    index = Math.max(0, Math.min(slides.length - 1, nextIndex));
    if (!document.body.hasAttribute("data-overview-mode")) {
      slides.forEach((slide, slideIndex) => { slide.hidden = slideIndex !== index; });
    }
    publishState();
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

  window.addEventListener("message", (event) => {
    const message = event.data;
    if (!message || message.type !== "hono-slides:command") return;
    if (message.action === "previous") show(index - 1);
    if (message.action === "next") show(index + 1);
    if (message.action === "fullscreen") void toggleFullscreen();
    if (message.action === "presenter") togglePresenter();
    if (message.action === "overview") toggleOverview();
  });

  show(0);
})();
</script>`;
}

function renderLiveReloadScript(eventsPath: string): string {
  return `<script>
(() => {
  try {
    const eventsUrl = ${JSON.stringify(eventsPath)};
    const events = new EventSource(eventsUrl);
    events.addEventListener("deck:updated", () => location.reload());
  } catch {}
})();
</script>`;
}

function renderClientEntryScript(clientEntry: string): string {
  return `<script type="module" src="${escapeHtml(clientEntry)}"></script>`;
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
