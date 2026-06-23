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
import type { DeckRenderable, MaybePromise } from "./jsx-renderer";

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
    .map((slide) => renderCompiledSlide(slide, deck.assets, { components, deck }))
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
    deck?: CompiledDeck;
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

  return `<section class="${classes}" data-slide-index="${slide.index}" data-slide-state="inactive"${slide.meta.title ? ` aria-label="${escapeHtml(slide.meta.title)}"` : ""}${transition}${style}><div class="hono-decks-slide-content">${html}</div>${notesHtml}</section>`;
}

export async function renderCompiledSlideAsync(
  slide: CompiledSlide,
  assets: AssetRef[] = [],
  input: {
    components?: SlideComponentRegistry;
    deck?: CompiledDeck;
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

  return `<section class="${classes}" data-slide-index="${slide.index}" data-slide-state="inactive"${slide.meta.title ? ` aria-label="${escapeHtml(slide.meta.title)}"` : ""}${transition}${style}><div class="hono-decks-slide-content">${html}</div>${notesHtml}</section>`;
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
  printPreview?: boolean;
}): string {
  const { deck } = input;
  const warnings = deck.warnings.length
    ? `<aside class="hono-decks-warnings">${deck.warnings.map((warning) => `<p>${escapeHtml(warning.message)}</p>`).join("")}</aside>`
    : "";
  const htmlAttrs = input.printPreview ? ' data-hono-decks-print-preview="true"' : "";
  const bodyAttrs = input.printPreview ? ' data-hono-decks-print-preview="true"' : "";

  return `<!doctype html>
<html lang="ja"${htmlAttrs}>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(deck.meta.title ?? deck.slug)}</title>
  <style>${basePresentationStyle()}${deck.themeStyle ?? ""}${input.style ?? ""}</style>
</head>
<body${bodyAttrs}>
  ${warnings}
  ${renderCompiledDeck(deck, { components: mergeComponentInputs(deck.componentRegistry, input.components) })}
  ${input.printPreview ? "" : renderPresentationScript()}
  ${!input.printPreview && input.liveReloadPath ? renderLiveReloadScript(input.liveReloadPath) : ""}
  ${!input.printPreview && input.clientEntry ? renderClientEntryScript(input.clientEntry) : ""}
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
  printPreview?: boolean;
}): Promise<string> {
  const { deck } = input;
  const warnings = deck.warnings.length
    ? `<aside class="hono-decks-warnings">${deck.warnings.map((warning) => `<p>${escapeHtml(warning.message)}</p>`).join("")}</aside>`
    : "";
  const htmlAttrs = input.printPreview ? ' data-hono-decks-print-preview="true"' : "";
  const bodyAttrs = input.printPreview ? ' data-hono-decks-print-preview="true"' : "";

  return `<!doctype html>
<html lang="ja"${htmlAttrs}>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(deck.meta.title ?? deck.slug)}</title>
  <style>${basePresentationStyle()}${deck.themeStyle ?? ""}${input.style ?? ""}</style>
</head>
<body${bodyAttrs}>
  ${warnings}
  ${await renderCompiledDeckAsync(deck, { components: mergeComponentInputs(deck.componentRegistry, input.components) })}
  ${input.printPreview ? "" : renderPresentationScript()}
  ${!input.printPreview && input.liveReloadPath ? renderLiveReloadScript(input.liveReloadPath) : ""}
  ${!input.printPreview && input.clientEntry ? renderClientEntryScript(input.clientEntry) : ""}
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
:root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:32px;--hono-decks-width:1920px;--hono-decks-height:1080px;--hono-decks-transition-duration:.24s;--hono-decks-transition-easing:ease;--hono-decks-color:#eef2ff;--hono-decks-muted-color:#cbd5e1;--hono-decks-accent-color:#8bd3ff;--hono-decks-border-color:rgba(148,163,184,.24);--hono-decks-inline-code-background:rgba(15,23,42,.72);--hono-decks-code-background:rgba(15,23,42,.78);--hono-decks-card-background:rgba(15,23,42,.78);--hono-decks-card-image-background:rgba(255,255,255,.08);--hono-decks-warning-background:rgba(255,193,7,.12);--hono-decks-warning-color:#ffe59b;color:var(--hono-decks-color)}
html,body{margin:0;width:100%;height:100%;overflow:hidden}
.hono-decks-stage{width:100vw;height:100vh;overflow:hidden;position:relative;display:grid;place-items:center}
.hono-decks-deck{display:grid;gap:1rem;width:var(--hono-decks-width);height:var(--hono-decks-height);box-sizing:border-box;transform-origin:left top}
.slide{box-sizing:border-box;aspect-ratio:16/9;padding:clamp(1.2rem,3vw,3rem);overflow:hidden}
.hono-decks-slide-content{width:100%;height:100%}
.slide.layout-cover,.slide.layout-statement{display:flex;flex-direction:column;justify-content:center}
.slide.layout-cover>.hono-decks-slide-content,.slide.layout-statement>.hono-decks-slide-content{display:flex;flex-direction:column;justify-content:center}
.slide code{font-family:"SFMono-Regular","Cascadia Code","Liberation Mono",Menlo,Consolas,monospace;font-size:.9em;line-height:1.45}
.slide :not(pre)>code{border-radius:6px;background:var(--hono-decks-inline-code-background);padding:.12em .34em}
.slide pre{max-width:100%;overflow:auto;box-sizing:border-box;border:1px solid var(--hono-decks-border-color);border-radius:8px;background:var(--hono-decks-code-background);padding:1rem;tab-size:2;white-space:pre}
.slide pre code{display:block;min-width:max-content;background:transparent;padding:0}
.hono-decks-code-block{margin:1rem 0;max-width:100%}
.hono-decks-code-caption{display:inline-flex;margin:0 0 .4rem;border:1px solid var(--hono-decks-border-color);border-radius:6px;padding:.2rem .5rem;background:var(--hono-decks-inline-code-background);color:var(--hono-decks-muted-color);font-size:.82rem}
.hono-decks-embed-frame{margin:1rem 0;max-width:100%}
.hono-decks-embed-viewport{width:min(100%,72rem);overflow:hidden}
.hono-decks-embed-viewport iframe{display:block;width:100%;height:100%;border:0}
.hono-decks-embed-fallback{margin:.45rem 0 0;color:var(--hono-decks-muted-color);font-size:.84rem}
.hono-decks-embed-fallback a{color:inherit}
.hono-decks-social-embed{margin:1rem 0;max-width:min(100%,42rem)}
.hono-decks-social-card{margin:0;border:1px solid var(--hono-decks-border-color);border-radius:8px;background:var(--hono-decks-card-background);padding:1rem}
.hono-decks-social-card p{margin:0 0 .75rem;line-height:1.55}
.hono-decks-social-card footer{display:flex;flex-wrap:wrap;gap:.65rem;align-items:center;color:var(--hono-decks-muted-color);font-size:.9rem}
.hono-decks-social-card a{color:inherit}
.hono-decks-tweet-embed{margin:1rem 0;max-width:min(100%,42rem)}
.hono-decks-tweet-embed .twitter-tweet{margin:0;border:1px solid var(--hono-decks-border-color);border-radius:8px;background:var(--hono-decks-card-background);padding:1rem}
.hono-decks-tweet-embed .twitter-tweet a{color:inherit}
.hono-decks-link-card{margin:1rem 0;max-width:min(100%,42rem)}
.hono-decks-link-card-anchor{display:grid;grid-template-columns:minmax(9rem,32%) minmax(0,1fr);gap:.75rem;align-items:stretch;border:1px solid var(--hono-decks-border-color);border-radius:8px;background:var(--hono-decks-card-background);padding:1rem;color:inherit;text-decoration:none}
.hono-decks-link-card-body{display:grid;gap:.35rem;min-width:0}
.hono-decks-link-card-image{width:100%;height:100%;max-height:10rem;aspect-ratio:16/9;object-fit:cover;border-radius:6px;background:var(--hono-decks-card-image-background)}
.hono-decks-link-card-site{color:var(--hono-decks-accent-color);font-size:.8rem;text-transform:uppercase}
.hono-decks-link-card-title{font-weight:700}
.hono-decks-link-card-description{color:var(--hono-decks-muted-color);line-height:1.45}
.hono-decks-link-card-label{color:var(--hono-decks-accent-color);font-size:.88rem}
@media (max-width: 640px){.hono-decks-link-card-anchor{grid-template-columns:1fr}.hono-decks-link-card-image{height:auto;max-height:12rem}}
.mdx-hero{height:100%;display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,42%);gap:clamp(1rem,3vw,3rem);align-items:center}
.mdx-hero:not(.has-image){grid-template-columns:1fr}
.mdx-hero-copy{min-width:0}
.mdx-hero-eyebrow{margin:0 0 .75rem;color:var(--hono-decks-accent-color);text-transform:uppercase;font-size:.85rem;letter-spacing:0}
.mdx-hero h1{margin:0;font-size:clamp(2.2rem,5vw,5rem);line-height:1.02}
.mdx-hero-subtitle{margin:1rem 0 0;font-size:clamp(1rem,1.8vw,1.5rem);line-height:1.45;color:var(--hono-decks-muted-color)}
.mdx-hero-image{width:100%;height:auto;max-height:70vh;object-fit:contain;border-radius:8px}
[data-hono-decks-fragment]{transition:opacity .18s ease,transform .18s ease}
[data-hono-decks-fragment][data-fragment-hidden]{visibility:hidden;opacity:0;transform:translateY(.35rem)}
[data-fire-effect=none][data-fragment-hidden]{transform:none}
[data-fire-effect=fade][data-fragment-hidden]{transform:none}
[data-fire-effect=fade-up][data-fragment-hidden]{transform:translateY(.85rem)}
[data-fire-effect=scale][data-fragment-hidden]{transform:scale(.96)}
body:not([data-overview-mode]) .hono-decks-deck{position:relative}
body:not([data-overview-mode]) .slide{position:absolute;inset:0;width:100%;height:100%}
.slide[data-transition]{transition:opacity var(--hono-decks-transition-duration) var(--hono-decks-transition-easing),transform var(--hono-decks-transition-duration) var(--hono-decks-transition-easing);will-change:opacity,transform}
.slide[data-slide-state="inactive"]{visibility:hidden;pointer-events:none}
.slide[data-slide-state="active"]{visibility:visible;opacity:1;transform:translate3d(0,0,0) scale(1)}
.slide[data-transition="fade"][data-slide-state="entering"],.slide[data-transition="fade"][data-slide-state="leaving"],.slide[data-transition="view-transition"][data-slide-state="entering"],.slide[data-transition="view-transition"][data-slide-state="leaving"]{opacity:0}
.slide[data-transition="fade-out"][data-slide-state="entering"]{opacity:1}
.slide[data-transition="fade-out"][data-slide-state="leaving"]{opacity:0}
.slide[data-transition="slide-left"][data-slide-direction="forward"][data-slide-state="entering"],.slide[data-transition="slide-right"][data-slide-direction="backward"][data-slide-state="leaving"]{transform:translate3d(100%,0,0)}
.slide[data-transition="slide-left"][data-slide-direction="forward"][data-slide-state="leaving"],.slide[data-transition="slide-right"][data-slide-direction="backward"][data-slide-state="entering"]{transform:translate3d(-100%,0,0)}
.slide[data-transition="slide-left"][data-slide-direction="backward"][data-slide-state="entering"],.slide[data-transition="slide-right"][data-slide-direction="forward"][data-slide-state="leaving"]{transform:translate3d(-100%,0,0)}
.slide[data-transition="slide-left"][data-slide-direction="backward"][data-slide-state="leaving"],.slide[data-transition="slide-right"][data-slide-direction="forward"][data-slide-state="entering"]{transform:translate3d(100%,0,0)}
.slide[data-transition="slide-up"][data-slide-direction="forward"][data-slide-state="entering"],.slide[data-transition="slide-down"][data-slide-direction="backward"][data-slide-state="leaving"]{transform:translate3d(0,100%,0)}
.slide[data-transition="slide-up"][data-slide-direction="forward"][data-slide-state="leaving"],.slide[data-transition="slide-down"][data-slide-direction="backward"][data-slide-state="entering"]{transform:translate3d(0,-100%,0)}
.slide[data-transition="slide-up"][data-slide-direction="backward"][data-slide-state="entering"],.slide[data-transition="slide-down"][data-slide-direction="forward"][data-slide-state="leaving"]{transform:translate3d(0,-100%,0)}
.slide[data-transition="slide-up"][data-slide-direction="backward"][data-slide-state="leaving"],.slide[data-transition="slide-down"][data-slide-direction="forward"][data-slide-state="entering"]{transform:translate3d(0,100%,0)}
body:not([data-overview-mode]) .slide[hidden]{display:none}
body[data-overview-mode] .hono-decks-deck{grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
body[data-overview-mode] .slide{cursor:pointer}
body[data-presenter-mode] .speaker-notes{display:block;margin-top:1rem;padding:.75rem;border-radius:8px;background:var(--hono-decks-card-image-background)}
.hono-decks-warnings{margin:1rem;padding:.75rem;border-radius:14px;background:var(--hono-decks-warning-background);color:var(--hono-decks-warning-color)}
@media screen{html[data-hono-decks-print-preview]{width:auto;height:auto;min-height:100%;overflow:visible}
body[data-hono-decks-print-preview]{min-height:100vh;overflow:auto;color-scheme:light;color:#000;--hono-decks-print-gap:6mm;--hono-decks-print-slot-height:80mm;--hono-decks-print-scale:.28}
body[data-hono-decks-print-preview] .hono-decks-stage{display:block;width:auto;height:auto;min-height:100vh;overflow:visible;padding:12mm 0;box-sizing:border-box}
body[data-hono-decks-print-preview] .hono-decks-deck{display:grid;grid-template-columns:1fr;grid-auto-rows:var(--hono-decks-print-slot-height);gap:var(--hono-decks-print-gap);width:calc(var(--hono-decks-print-slot-height) * 16 / 9);max-width:calc(100vw - 24px);height:auto;margin:0 auto;transform:none!important}
body[data-hono-decks-print-preview] .slide{position:static;width:100%;max-width:100%;height:var(--hono-decks-print-slot-height);aspect-ratio:16/9;justify-self:center;align-self:center;padding:0;box-shadow:0 2px 10px rgba(15,23,42,.16);transition:none!important;transform:none!important}
body[data-hono-decks-print-preview] .hono-decks-slide-content{width:var(--hono-decks-width);height:var(--hono-decks-height);box-sizing:border-box;padding:clamp(1.2rem,3vw,3rem);transform:scale(var(--hono-decks-print-scale));transform-origin:left top;overflow:hidden}
body[data-hono-decks-print-preview]:not([data-overview-mode]) .slide[hidden]{display:block!important}
body[data-hono-decks-print-preview] .slide[data-slide-state]{visibility:visible!important;opacity:1!important;transform:none!important}
body[data-hono-decks-print-preview] [data-hono-decks-fragment]{visibility:visible!important;opacity:1!important;transform:none!important}}
@page{size:A4 portrait;margin:12mm}
@media print{:root{color-scheme:light;color:#000;--hono-decks-print-gap:6mm;--hono-decks-print-slot-height:80mm;--hono-decks-print-scale:.28}html,body{width:auto;height:auto;overflow:visible}.hono-decks-stage{display:block;width:auto;height:auto;overflow:visible}.hono-decks-deck{display:grid;grid-template-columns:1fr;grid-auto-rows:var(--hono-decks-print-slot-height);gap:var(--hono-decks-print-gap);width:calc(var(--hono-decks-print-slot-height) * 16 / 9);height:auto;margin:0 auto;transform:none!important}.slide{position:static;width:100%;max-width:100%;height:var(--hono-decks-print-slot-height);aspect-ratio:16/9;justify-self:center;align-self:center;padding:0;page-break-after:auto;break-after:auto;break-inside:avoid;box-shadow:none;transition:none!important;transform:none!important}.hono-decks-slide-content{width:var(--hono-decks-width);height:var(--hono-decks-height);box-sizing:border-box;padding:clamp(1.2rem,3vw,3rem);transform:scale(var(--hono-decks-print-scale));transform-origin:left top;overflow:hidden}.slide:nth-of-type(3n):not(:last-child){page-break-after:always;break-after:page}body:not([data-overview-mode]) .slide[hidden]{display:block!important}.slide[data-slide-state]{visibility:visible!important;opacity:1!important;transform:none!important}[data-hono-decks-fragment]{visibility:visible!important;opacity:1!important;transform:none!important}}
@media (prefers-reduced-motion: reduce){*,*::before,*::after{scroll-behavior:auto!important;animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}.slide[data-transition]{transform:none!important}}`;
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
  let previousIndex = 0;
  let stepIndex = 0;
  let stepCount = 0;
  let isTransitioning = false;

  function fitDeck() {
    if (!(stage instanceof HTMLElement) || !(deck instanceof HTMLElement)) return;
    const bounds = stage.getBoundingClientRect();
    const scale = Math.min(bounds.width / DESIGN_WIDTH, bounds.height / DESIGN_HEIGHT);
    deck.style.transform = "scale(" + scale + ")";
  }

  function publishState() {
    if (window.parent !== window) window.parent.postMessage({ type: "hono-decks:state", index, stepIndex, stepCount, slideCount: slides.length }, "*");
  }

  function slideFragments(slide) {
    return Array.from(slide?.querySelectorAll("[data-hono-decks-fragment]") ?? []).sort((a, b) => fragmentOrder(a, 0) - fragmentOrder(b, 0));
  }

  function fragmentOrder(fragment, fallback) {
    const order = Number(fragment.getAttribute("data-fragment-order"));
    return Number.isFinite(order) && order > 0 ? order : fallback;
  }

  function fragmentCountForSlide(slideIndex) {
    return slideFragments(slides[slideIndex]).length;
  }

  function setFragmentsVisible(fragments, visible) {
    fragments.forEach((fragment) => {
      fragment.toggleAttribute("data-fragment-hidden", !visible);
      fragment.setAttribute("aria-hidden", visible ? "false" : "true");
    });
  }

  function updateFragments(nextStepIndex) {
    const fragments = slideFragments(slides[index]);
    stepCount = fragments.length;
    stepIndex = Math.max(0, Math.min(stepCount, nextStepIndex));
    fragments.forEach((fragment, fragmentIndex) => {
      const visible = fragmentOrder(fragment, fragmentIndex + 1) <= stepIndex;
      fragment.toggleAttribute("data-fragment-hidden", !visible);
      fragment.setAttribute("aria-hidden", visible ? "false" : "true");
    });
  }

  function setSlideState(slide, state, direction) {
    if (!slide) return;
    slide.setAttribute("data-slide-state", state);
    if (direction) {
      slide.setAttribute("data-slide-direction", direction);
    } else {
      slide.removeAttribute("data-slide-direction");
    }
    slide.hidden = state === "inactive";
  }

  function transitionForSlide(slide) {
    return slide?.getAttribute("data-transition") || "none";
  }

  function transitionDurationMs() {
    const value = getComputedStyle(document.documentElement).getPropertyValue("--hono-decks-transition-duration").trim();
    if (value.endsWith("ms")) return Number.parseFloat(value) || 0;
    if (value.endsWith("s")) return (Number.parseFloat(value) || 0) * 1000;
    return 240;
  }

  function prefersReducedMotion() {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
  }

  function applyInstantSlideChange(targetIndex, nextStepIndex = 0, direction) {
    previousIndex = index;
    index = Math.max(0, Math.min(slides.length - 1, targetIndex));
    slides.forEach((slide, slideIndex) => {
      setSlideState(slide, slideIndex === index ? "active" : "inactive", slideIndex === index ? direction : undefined);
    });
    updateFragments(nextStepIndex);
    publishState();
  }

  function finishSlideTransition(outgoing, incoming, direction) {
    setSlideState(outgoing, "inactive");
    setSlideState(incoming, "active", direction);
    isTransitioning = false;
  }

  function show(nextIndex, nextStepIndex = 0) {
    const targetIndex = Math.max(0, Math.min(slides.length - 1, nextIndex));
    const direction = targetIndex >= index ? "forward" : "backward";
    if (document.body.hasAttribute("data-overview-mode") || targetIndex === index) {
      applyInstantSlideChange(targetIndex, nextStepIndex, direction);
      return;
    }
    if (isTransitioning) return;

    const outgoing = slides[index];
    const incoming = slides[targetIndex];
    const transition = transitionForSlide(incoming);
    if (transition === "none" || prefersReducedMotion()) {
      applyInstantSlideChange(targetIndex, nextStepIndex, direction);
      return;
    }

    if (transition === "view-transition" && typeof document.startViewTransition === "function") {
      isTransitioning = true;
      const viewTransition = document.startViewTransition(() => {
        applyInstantSlideChange(targetIndex, nextStepIndex, direction);
      });
      Promise.resolve(viewTransition.finished).finally(() => {
        isTransitioning = false;
      });
      return;
    }

    isTransitioning = true;
    previousIndex = index;
    index = targetIndex;
    slides.forEach((slide) => {
      if (slide !== outgoing && slide !== incoming) setSlideState(slide, "inactive");
    });
    setSlideState(outgoing, "active", direction);
    setSlideState(incoming, "entering", direction);
    updateFragments(nextStepIndex);
    publishState();
    requestAnimationFrame(() => {
      setSlideState(outgoing, "leaving", direction);
      setSlideState(incoming, "active", direction);
      window.setTimeout(() => finishSlideTransition(outgoing, incoming, direction), transitionDurationMs() + 40);
    });
  }

  function next() {
    if (stepIndex < stepCount) {
      updateFragments(stepIndex + 1);
      publishState();
      return;
    }
    show(index + 1, 0);
  }

  function previous() {
    if (stepIndex > 0) {
      updateFragments(stepIndex - 1);
      publishState();
      return;
    }
    if (index > 0) {
      const previousIndex = index - 1;
      show(previousIndex, fragmentCountForSlide(previousIndex));
      return;
    }
    show(0, 0);
  }

  function toggleOverview() {
    const enabled = document.body.toggleAttribute("data-overview-mode");
    slides.forEach((slide) => {
      slide.hidden = false;
      slide.setAttribute("data-slide-state", "active");
      slide.removeAttribute("data-slide-direction");
    });
    setFragmentsVisible(Array.from(document.querySelectorAll("[data-hono-decks-fragment]")), enabled);
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
    if (event.key === "ArrowRight" || event.key === " ") next();
    if (event.key === "ArrowLeft") previous();
    if (event.key === "f") void toggleFullscreen();
    if (event.key === "p") togglePresenter();
    if (event.key === "o") toggleOverview();
  });

  window.addEventListener("message", (event) => {
    const message = event.data;
    if (!message || message.type !== "hono-decks:command") return;
    if (message.action === "previous") previous();
    if (message.action === "next") next();
    if (message.action === "goTo" && Number.isInteger(message.index)) show(message.index, Number.isInteger(message.stepIndex) ? message.stepIndex : 0);
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
