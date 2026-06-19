import { RenderError } from "../deck/model";
import type { AssetRef, CompiledDeck, CompiledSlide } from "../deck/model";
import {
  builtInSlideComponents,
  createMdxComponents,
  defineSlideComponents,
  renderJsxValue,
  renderSlideNodes,
  renderSlideNodesAsync,
} from "./jsx-renderer";
import type { SlideComponentInput, SlideComponentRegistry } from "./jsx-renderer";

export { defineSlideComponents };
export { createMdxComponents };
export { builtInSlideComponents };
export type {
  DeckRenderable,
  MaybePromise,
  SlideComponent,
  SlideComponentDefinition,
  SlideComponentInput,
  SlideComponentProps,
  SlideComponentRegistry,
} from "./jsx-renderer";

export function renderCompiledDeck(
  deck: CompiledDeck,
  input: {
    components?: SlideComponentRegistry | Record<string, SlideComponentInput>;
  } = {},
): string {
  const components = normalizeComponents(input.components);
  return `<main class="hono-decks-stage" data-hono-decks-stage data-deck-slug="${escapeHtml(deck.slug)}"><div class="hono-decks-deck" data-hono-decks-deck>${deck.slides
    .map((slide) => renderCompiledSlide(slide, deck.assets, { components }))
    .join("\n")}</div></main>`;
}

export async function renderCompiledDeckAsync(
  deck: CompiledDeck,
  input: {
    components?: SlideComponentRegistry | Record<string, SlideComponentInput>;
  } = {},
): Promise<string> {
  const components = normalizeComponents(input.components);
  const slides = await Promise.all(
    deck.slides.map((slide) => renderCompiledSlideAsync(slide, deck.assets, { components, deck })),
  );
  return `<main class="hono-decks-stage" data-hono-decks-stage data-deck-slug="${escapeHtml(deck.slug)}"><div class="hono-decks-deck" data-hono-decks-deck>${slides.join(
    "\n",
  )}</div></main>`;
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

export async function renderCompiledSlideAsync(
  slide: CompiledSlide,
  assets: AssetRef[] = [],
  input: {
    components?: SlideComponentRegistry;
    deck?: Pick<CompiledDeck, "sourcePath">;
  } = {},
): Promise<string> {
  const layout = slide.meta.layout ?? "default";
  const classes = ["slide", `layout-${safeClass(layout)}`, slide.meta.className ? safeClass(slide.meta.className) : ""]
    .filter(Boolean)
    .join(" ");
  const notes = slide.notes ?? slide.meta.notes;
  const notesHtml = notes ? `<aside class="speaker-notes" hidden>${escapeHtml(notes)}</aside>` : "";
  const html = await renderSlideBodyAsync(slide, assets, input);
  const style = slide.meta.background ? ` style="${escapeHtml(backgroundStyle(slide.meta.background, assets))}"` : "";
  const transition = slide.meta.transition ? ` data-transition="${escapeHtml(safeClass(slide.meta.transition))}"` : "";

  return `<section class="${classes}" data-slide-index="${slide.index}"${slide.meta.title ? ` aria-label="${escapeHtml(slide.meta.title)}"` : ""}${transition}${style}>${html}${notesHtml}</section>`;
}

async function renderSlideBodyAsync(
  slide: CompiledSlide,
  assets: AssetRef[],
  input: {
    components?: SlideComponentRegistry;
    deck?: Pick<CompiledDeck, "sourcePath">;
  },
): Promise<string> {
  try {
    return slide.render
      ? await renderJsxValue(
          slide.render({ components: createMdxComponents(input.components ?? builtInSlideComponents, { assets }) }),
        )
      : slide.nodes?.length
        ? await renderSlideNodesAsync(slide.nodes, { components: input.components, assets })
        : rewriteLocalAssetUrls(slide.html, assets);
  } catch (error) {
    if (error instanceof RenderError) throw error;
    throw new RenderError(
      `Render failed in ${input.deck?.sourcePath ?? "unknown deck"} slide ${slide.index + 1}: ${formatErrorMessage(error)}`,
      "slide-render-error",
      error,
    );
  }
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
    ? `<aside class="hono-decks-warnings">${deck.warnings.map((warning) => `<p>${escapeHtml(warning.message)}</p>`).join("")}</aside>`
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
  ${renderCompiledDeck(deck, { components: mergeComponentInputs(deck.componentRegistry, input.components) })}
  ${renderPresentationScript()}
  ${input.liveReloadPath ? renderLiveReloadScript(input.liveReloadPath) : ""}
  ${input.clientEntry ? renderClientEntryScript(input.clientEntry) : ""}
</body>
</html>`;
}

export async function renderCompiledDeckPageAsync(input: {
  deck: CompiledDeck;
  mountPath: string;
  style?: string;
  liveReloadPath?: string;
  components?: SlideComponentRegistry | Record<string, SlideComponentInput>;
  clientEntry?: string;
}): Promise<string> {
  const { deck } = input;
  const warnings = deck.warnings.length
    ? `<aside class="hono-decks-warnings">${deck.warnings.map((warning) => `<p>${escapeHtml(warning.message)}</p>`).join("")}</aside>`
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
  ${await renderCompiledDeckAsync(deck, { components: mergeComponentInputs(deck.componentRegistry, input.components) })}
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

function mergeComponentInputs(
  base: Record<string, SlideComponentInput> | undefined,
  overrides: SlideComponentRegistry | Record<string, SlideComponentInput> | undefined,
): Record<string, SlideComponentInput> | SlideComponentRegistry | undefined {
  if (!base) return overrides;
  if (!overrides) return base;
  return { ...base, ...overrides };
}

function basePresentationStyle(): string {
  return `
:root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0b1020;color:#eef2ff;--hono-decks-width:1920px;--hono-decks-height:1080px}
html,body{margin:0;width:100%;height:100%;overflow:hidden}
.hono-decks-stage{width:100vw;height:100vh;overflow:hidden;background:#0b1020;position:relative;display:grid;place-items:center}
.hono-decks-deck{display:grid;gap:1rem;padding:1rem;width:var(--hono-decks-width);height:var(--hono-decks-height);box-sizing:border-box;transform-origin:left top}
.slide{aspect-ratio:16/9;border:1px solid rgba(255,255,255,.13);border-radius:24px;padding:clamp(1.2rem,3vw,3rem);background:linear-gradient(145deg,rgba(255,255,255,.12),rgba(255,255,255,.035));overflow:hidden}
.slide.layout-cover,.slide.layout-statement{display:flex;flex-direction:column;justify-content:center}
.slide code{font-family:"SFMono-Regular","Cascadia Code","Liberation Mono",Menlo,Consolas,monospace;font-size:.9em;line-height:1.45}
.slide :not(pre)>code{border-radius:6px;background:rgba(15,23,42,.72);padding:.12em .34em}
.slide pre{max-width:100%;overflow:auto;box-sizing:border-box;border:1px solid rgba(148,163,184,.24);border-radius:8px;background:rgba(15,23,42,.78);padding:1rem;tab-size:2;white-space:pre}
.slide pre code{display:block;min-width:max-content;background:transparent;padding:0}
.hono-decks-code-block{margin:1rem 0;max-width:100%}
.hono-decks-code-caption{display:inline-flex;margin:0 0 .4rem;border:1px solid rgba(148,163,184,.24);border-radius:6px;padding:.2rem .5rem;background:rgba(15,23,42,.72);color:#cbd5e1;font-size:.82rem}
.hono-decks-embed-frame{margin:1rem 0;max-width:100%}
.hono-decks-embed-viewport{width:min(100%,72rem);overflow:hidden;border:1px solid rgba(148,163,184,.24);border-radius:8px;background:rgba(15,23,42,.78)}
.hono-decks-embed-viewport iframe{display:block;width:100%;height:100%;border:0}
.hono-decks-embed-fallback{margin:.45rem 0 0;color:#cbd5e1;font-size:.84rem}
.hono-decks-embed-fallback a{color:inherit}
.hono-decks-social-embed{margin:1rem 0;max-width:min(100%,42rem)}
.hono-decks-social-card{margin:0;border:1px solid rgba(148,163,184,.24);border-radius:8px;background:rgba(15,23,42,.78);padding:1rem}
.hono-decks-social-card p{margin:0 0 .75rem;line-height:1.55}
.hono-decks-social-card footer{display:flex;flex-wrap:wrap;gap:.65rem;align-items:center;color:#cbd5e1;font-size:.9rem}
.hono-decks-social-card a{color:inherit}
.mdx-hero{height:100%;display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,42%);gap:clamp(1rem,3vw,3rem);align-items:center}
.mdx-hero:not(.has-image){grid-template-columns:1fr}
.mdx-hero-copy{min-width:0}
.mdx-hero-eyebrow{margin:0 0 .75rem;color:#8bd3ff;text-transform:uppercase;font-size:.85rem;letter-spacing:0}
.mdx-hero h1{margin:0;font-size:clamp(2.2rem,5vw,5rem);line-height:1.02}
.mdx-hero-subtitle{margin:1rem 0 0;font-size:clamp(1rem,1.8vw,1.5rem);line-height:1.45;color:#cbd5e1}
.mdx-hero-image{width:100%;height:auto;max-height:70vh;object-fit:contain;border-radius:8px}
body:not([data-overview-mode]) .slide[hidden]{display:none}
body[data-overview-mode] .hono-decks-deck{grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
body[data-overview-mode] .slide{cursor:pointer}
body[data-presenter-mode] .speaker-notes{display:block;margin-top:1rem;padding:.75rem;border-radius:8px;background:rgba(255,255,255,.08)}
.hono-decks-warnings{margin:1rem;padding:.75rem;border-radius:14px;background:rgba(255,193,7,.12);color:#ffe59b}`;
}

function renderPresentationScript(): string {
  return `<script>
(() => {
  const slides = Array.from(document.querySelectorAll(".slide"));
  const stage = document.querySelector("[data-hono-decks-stage]");
  const deck = document.querySelector("[data-hono-decks-deck]");
  const DESIGN_WIDTH = 1920;
  const DESIGN_HEIGHT = 1080;
  let index = 0;

  function fitDeck() {
    if (!(stage instanceof HTMLElement) || !(deck instanceof HTMLElement)) return;
    const bounds = stage.getBoundingClientRect();
    const scale = Math.min(bounds.width / DESIGN_WIDTH, bounds.height / DESIGN_HEIGHT);
    deck.style.transform = "scale(" + scale + ")";
  }

  function publishState() {
    if (window.parent !== window) window.parent.postMessage({ type: "hono-decks:state", index, slideCount: slides.length }, "*");
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
    if (!message || message.type !== "hono-decks:command") return;
    if (message.action === "previous") show(index - 1);
    if (message.action === "next") show(index + 1);
    if (message.action === "goTo" && Number.isInteger(message.index)) show(message.index);
    if (message.action === "fullscreen") void toggleFullscreen();
    if (message.action === "presenter") togglePresenter();
    if (message.action === "overview") toggleOverview();
  });

  window.addEventListener("resize", fitDeck);
  fitDeck();
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

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
