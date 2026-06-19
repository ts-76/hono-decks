import { Hono } from "hono";
import type { Context, MiddlewareHandler } from "hono";
import { jsx } from "hono/jsx/jsx-runtime";
import { renderCompiledDeckPageAsync } from "../renderer/compiled-render";
import { renderJsxValue } from "../renderer/jsx-renderer";
import { RenderError } from "../deck/model";
import type { CompiledDeck, DeckSource } from "../deck/model";
import type { DeckRenderable, DeckTheme, MaybePromise } from "../renderer/compiled-render";
import type { SlideComponentInput, SlideComponentRegistry } from "../renderer/compiled-render";
import { serveDecksClientEntry } from "./client-entry";

export interface DecksRouterExtension {
  path: string;
  router: Hono;
}

export interface DecksRouterOptions {
  source: DeckSource;
  dev?: boolean;
  extensions?: DecksRouterExtension[];
  liveReloadPath?(slug: string, mountPath: string): string | undefined;
  style?: string;
  theme?: DeckTheme;
  components?: SlideComponentRegistry | Record<string, SlideComponentInput>;
  clientEntry?: string;
  clientEntryAsset?: string;
  clientEntryAssetPath?: string;
  viewer?: DeckViewerOptions;
}

export interface DeckViewerOptions {
  controls?: boolean;
  style?: string;
  head?: MaybePromise<DeckRenderable>;
  render?(input: DeckViewerRenderInput): MaybePromise<DeckRenderable>;
}

export interface DeckTocItem {
  index: number;
  title?: string;
  label: string;
}

export interface DeckPageMeta {
  title: string;
  description?: string;
  canonicalPath: string;
  renderPath: string;
  printPath: string;
  imagePath?: string;
}

export interface DeckViewerParts {
  slug: string;
  title: string;
  renderUrl: string;
  frame: DeckRenderable;
  frameHtml: string;
  controls: DeckRenderable | null;
  controlsHtml: string | null;
  toc: DeckRenderable;
  tocHtml: string;
  slides: DeckTocItem[];
  meta: DeckPageMeta;
}

export interface DeckViewerRenderInput extends DeckViewerParts {
  deck: CompiledDeck;
  mountPath: string;
}

export interface DeckContextVariables {
  deck: CompiledDeck;
  deckViewer: DeckViewerParts;
  deckToc: DeckTocItem[];
  deckMeta: DeckPageMeta;
}

export interface DeckContextOptions {
  source: DeckSource;
  dev?: boolean;
  mountPath?: string;
  viewer?: Pick<DeckViewerOptions, "controls">;
}

export function decksRouter(options: DecksRouterOptions): Hono {
  const router = new Hono();

  if (options.clientEntryAsset) {
    router.get(normalizeClientEntryAssetPath(options.clientEntryAssetPath), serveDecksClientEntry(options.clientEntryAsset));
  }

  for (const extension of options.extensions ?? []) {
    router.route(extension.path, extension.router);
  }

  router.get("/", async (c) => {
    const decks = (await options.source.listDecks(c)).filter((deck) => isDevEnabled(options) || !deck.draft);
    return c.html(renderDeckIndex(decks, c.req.path));
  });

  router.get("/:slug/assets/*", async (c) => {
    const slug = c.req.param("slug");
    const assetPath = extractAssetPath(c.req.path, slug);
    const deck = await options.source.getCompiledDeck(c, slug);
    if (!deck || (!isDevEnabled(options) && deck.meta.draft)) {
      return c.json({ error: "Asset not found", slug, assetPath }, 404);
    }
    const response = await options.source.getAsset?.(c, slug, assetPath);
    if (!response) return c.json({ error: "Asset not found", slug, assetPath }, 404);
    return response;
  });

  router.get("/:slug/render", async (c) => {
    const slug = c.req.param("slug");
    const deck = await options.source.getCompiledDeck(c, slug);
    if (!deck || (!isDevEnabled(options) && deck.meta.draft)) return c.json({ error: "Deck not found", slug }, 404);
    const mountPath = stripPathSuffix(c.req.path, `/${slug}/render`);
    const clientEntry = options.clientEntry ?? resolveGeneratedClientEntryUrl(options, mountPath);
    try {
      return c.html(
        await renderCompiledDeckPageAsync({
          deck,
          mountPath,
          style: options.style,
          theme: options.theme,
          components: options.components,
          clientEntry,
          liveReloadPath: isDevEnabled(options) ? options.liveReloadPath?.(slug, mountPath) : undefined,
        }),
      );
    } catch (error) {
      const message =
        error instanceof RenderError ? error.message : `Render failed in ${deck.sourcePath}: ${formatErrorMessage(error)}`;
      return c.text(message, 500);
    }
  });

  router.get("/:slug/print", async (c) => {
    const slug = c.req.param("slug");
    const deck = await options.source.getCompiledDeck(c, slug);
    if (!deck || (!isDevEnabled(options) && deck.meta.draft)) return c.json({ error: "Deck not found", slug }, 404);
    const mountPath = stripPathSuffix(c.req.path, `/${slug}/print`);
    try {
      return c.html(
        await renderCompiledDeckPageAsync({
          deck,
          mountPath,
          style: options.style,
          theme: options.theme,
          components: options.components,
          printPreview: true,
        }),
      );
    } catch (error) {
      const message =
        error instanceof RenderError ? error.message : `Render failed in ${deck.sourcePath}: ${formatErrorMessage(error)}`;
      return c.text(message, 500);
    }
  });

  router.get("/:slug/presentation", async (c) => {
    const slug = c.req.param("slug");
    return c.redirect(`${stripPathSuffix(c.req.path, `/${slug}/presentation`)}/${encodeURIComponent(slug)}/render`, 302);
  });

  router.get("/:slug", async (c) => {
    const slug = c.req.param("slug");
    const deck = await options.source.getCompiledDeck(c, slug);
    if (!deck || (!isDevEnabled(options) && deck.meta.draft)) return c.json({ error: "Deck not found", slug }, 404);
    const mountPath = stripPathSuffix(c.req.path, `/${slug}`);
    return c.html(
      await renderDeckViewerPage({
        deck,
        mountPath,
        viewer: options.viewer,
      }),
    );
  });

  return router;
}

export function deckContext(options: DeckContextOptions): MiddlewareHandler<{ Variables: DeckContextVariables }> {
  return async (c, next) => {
    const slug = c.req.param("slug");
    if (!slug) return c.json({ error: "Deck not found", slug: "" }, 404);
    const deck = await options.source.getCompiledDeck(c, slug);
    if (!deck || (options.dev !== true && deck.meta.draft)) return c.json({ error: "Deck not found", slug }, 404);
    const mountPath = options.mountPath ?? inferMountPath(c.req.path, slug);
    const viewer = createDeckViewerParts({
      deck,
      mountPath,
      controls: options.viewer?.controls,
    });

    c.set("deck", deck);
    c.set("deckViewer", viewer);
    c.set("deckToc", viewer.slides);
    c.set("deckMeta", viewer.meta);
    await next();
  };
}

export function createDeckViewerParts(input: {
  deck: CompiledDeck;
  mountPath: string;
  controls?: boolean;
}): DeckViewerParts {
  const slug = input.deck.slug;
  const title = input.deck.meta.title ?? slug;
  const basePath = input.mountPath.replace(/\/$/, "");
  const canonicalPath = `${basePath}/${encodeURIComponent(slug)}`;
  const renderUrl = `${canonicalPath}/render`;
  const printPath = `${canonicalPath}/print`;
  const slides = createDeckToc(input.deck);
  const meta: DeckPageMeta = {
    title,
    description: input.deck.meta.description,
    canonicalPath,
    renderPath: renderUrl,
    printPath,
  };

  return {
    slug,
    title,
    renderUrl,
    frame: renderViewerFrame({ title, renderUrl }),
    frameHtml: renderViewerFrameHtml({ title, renderUrl }),
    controls: input.controls === false ? null : renderViewerControls(),
    controlsHtml: input.controls === false ? null : renderViewerControlsHtml(),
    toc: renderViewerToc(slides),
    tocHtml: renderViewerTocHtml(slides),
    slides,
    meta,
  };
}

function isDevEnabled(options: DecksRouterOptions): boolean {
  return options.dev === true;
}

function extractAssetPath(path: string, slug: string): string {
  const marker = `/${slug}/assets/`;
  const markerIndex = path.indexOf(marker);
  if (markerIndex === -1) return "";
  return path.slice(markerIndex + marker.length);
}

function stripPathSuffix(path: string, suffix: string): string {
  return path.endsWith(suffix) ? path.slice(0, -suffix.length) : path;
}

function inferMountPath(path: string, slug: string): string {
  const marker = `/${slug}`;
  const markerIndex = path.indexOf(marker);
  if (markerIndex === -1) return "";
  return path.slice(0, markerIndex) || "/";
}

function resolveGeneratedClientEntryUrl(options: DecksRouterOptions, mountPath: string): string | undefined {
  if (!options.clientEntryAsset) return undefined;
  const basePath = mountPath === "/" ? "" : mountPath.replace(/\/$/, "");
  return `${basePath}${normalizeClientEntryAssetPath(options.clientEntryAssetPath)}`;
}

function normalizeClientEntryAssetPath(path = "/_assets/client.js"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return normalized.replace(/\/{2,}/g, "/");
}

function renderDeckIndex(decks: Awaited<ReturnType<DeckSource["listDecks"]>>, mountPath: string): string {
  const basePath = mountPath.replace(/\/$/, "");
  const items = decks
    .map((deck) => {
      const href = `${basePath}/${encodeURIComponent(deck.slug)}`;
      const title = escapeHtml(deck.title ?? deck.slug);
      const description = deck.description ? `<p>${escapeHtml(deck.description)}</p>` : "";
      return `<li><a href="${href}">${title}</a>${description}</li>`;
    })
    .join("");

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Hono Decks</title>
</head>
<body>
  <main>
    <h1>Hono Decks</h1>
    <ul>${items}</ul>
  </main>
</body>
</html>`;
}

async function renderDeckViewerPage(input: {
  deck: CompiledDeck;
  mountPath: string;
  viewer?: DeckViewerOptions;
}): Promise<string> {
  const parts = createDeckViewerParts({
    deck: input.deck,
    mountPath: input.mountPath,
    controls: input.viewer?.controls,
  });
  const content =
    input.viewer?.render?.({
      ...parts,
      deck: input.deck,
      mountPath: input.mountPath,
    }) ??
    jsx("main", {
      "data-hono-decks-viewer": true,
      "data-deck-slug": parts.slug,
      "aria-labelledby": "hono-decks-viewer-title",
      children: [
        jsx("header", {
          class: "hono-decks-viewer-header",
          children: [
            jsx("h1", { id: "hono-decks-viewer-title", class: "hono-decks-viewer-title", children: parts.title }),
            jsx("p", {
              class: "hono-decks-viewer-meta",
              children: `${parts.slides.length} ${parts.slides.length === 1 ? "slide" : "slides"}`,
            }),
          ],
        }),
        jsx("div", {
          class: "hono-decks-viewer-shell",
          children: [parts.frame, parts.controls],
        }),
      ],
    });
  const head = input.viewer?.head ? await renderJsxValue(await input.viewer.head) : "";

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(parts.title)}</title>
  <style>${baseViewerStyle()}${input.viewer?.style ?? ""}</style>
  ${head}
</head>
<body>
  ${await renderJsxValue(await content)}
  ${renderViewerScript()}
</body>
</html>`;
}

function createDeckToc(deck: CompiledDeck): DeckTocItem[] {
  return deck.slides.map((slide) => ({
    index: slide.index,
    title: slide.meta.title,
    label: slide.meta.title ?? `Slide ${slide.index + 1}`,
  }));
}

function renderViewerFrame(input: { title: string; renderUrl: string }): DeckRenderable {
  return jsx("div", {
    class: "hono-decks-viewer-stage",
    "data-hono-decks-frame": true,
    children: jsx("div", {
      class: "hono-decks-viewport",
      "data-viewer-viewport": true,
      tabindex: "0",
      children: jsx("div", {
        class: "hono-decks-frame-stage",
        "data-viewer-stage": true,
        children: jsx("iframe", {
          title: input.title,
          src: input.renderUrl,
        }),
      }),
    }),
  });
}

function renderViewerFrameHtml(input: { title: string; renderUrl: string }): string {
  return `<div class="hono-decks-viewer-stage" data-hono-decks-frame><div class="hono-decks-viewport" data-viewer-viewport tabindex="0"><div class="hono-decks-frame-stage" data-viewer-stage><iframe title="${escapeHtml(input.title)}" src="${escapeHtml(input.renderUrl)}"></iframe></div></div></div>`;
}

function renderViewerControls(): DeckRenderable {
  return jsx("nav", {
    class: "hono-decks-viewer-controls",
    "data-hono-decks-viewer-controls": true,
    "aria-label": "Viewer controls",
    children: [
      jsx("button", { type: "button", "data-action": "previous", children: "Prev" }),
      jsx("span", { "data-slide-position": true, children: "1 / ?" }),
      jsx("button", { type: "button", "data-action": "next", children: "Next" }),
      jsx("button", { type: "button", "data-action": "fullscreen", children: "Full" }),
    ],
  });
}

function renderViewerControlsHtml(): string {
  return `<nav class="hono-decks-viewer-controls" data-hono-decks-viewer-controls aria-label="Viewer controls"><button type="button" data-action="previous">Prev</button><span data-slide-position>1 / ?</span><button type="button" data-action="next">Next</button><button type="button" data-action="fullscreen">Full</button></nav>`;
}

function renderViewerToc(slides: DeckTocItem[]): DeckRenderable {
  return jsx("nav", {
    class: "hono-decks-viewer-toc",
    "data-hono-decks-toc": true,
    "aria-label": "Slide navigation",
    children: jsx("ol", {
      children: slides.map((slide) =>
        jsx("li", {
          children: jsx("button", {
            type: "button",
            "data-action": "goTo",
            "data-slide-index": String(slide.index),
            children: slide.label,
          }),
        }),
      ),
    }),
  });
}

function renderViewerTocHtml(slides: DeckTocItem[]): string {
  const items = slides
    .map(
      (slide) =>
        `<li><button type="button" data-action="goTo" data-slide-index="${slide.index}">${escapeHtml(slide.label)}</button></li>`,
    )
    .join("");
  return `<nav class="hono-decks-viewer-toc" data-hono-decks-toc aria-label="Slide navigation"><ol>${items}</ol></nav>`;
}

function baseViewerStyle(): string {
  return `
:root{color-scheme:dark;background:#050816;color:#eef2ff;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
html,body{margin:0;min-height:100vh}
body{overflow:hidden}
[data-hono-decks-viewer]{min-height:100vh;display:grid;place-items:center;box-sizing:border-box}
.hono-decks-viewer-header{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.hono-decks-viewer-title{margin:0;font-size:1rem;line-height:1.25}
.hono-decks-viewer-meta{margin:.2rem 0 0;color:#cbd5e1;font-size:.82rem}
.hono-decks-viewer-shell{display:grid;place-items:center;gap:12px;min-width:0;min-height:0}
.hono-decks-viewer-stage{display:grid;place-items:center;min-width:0;min-height:0}
.hono-decks-viewport{width:min(100vw,calc(100vh * 16 / 9));aspect-ratio:16/9;position:relative;overflow:hidden;touch-action:pan-y}
.hono-decks-viewport:focus-visible{outline:2px solid currentColor;outline-offset:4px}
.hono-decks-frame-stage{width:100%;height:100%}
.hono-decks-frame-stage iframe{width:100%;height:100%;border:0;display:block;background:#0b1020}
.hono-decks-viewer-controls{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);display:flex;gap:8px;align-items:center}
.hono-decks-viewer-toc button,.hono-decks-viewer-controls button{font:inherit}
@media (prefers-reduced-motion: reduce){*,*::before,*::after{scroll-behavior:auto!important;animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}}`;
}

function renderViewerScript(): string {
  return `<script>
(() => {
  const root = document.querySelector("[data-hono-decks-viewer]");
  const viewport = document.querySelector("[data-viewer-viewport]");
  const iframe = document.querySelector("iframe");
  const position = document.querySelector("[data-slide-position]");
  let pointerStartX = null;
  let pointerStartY = null;

  function sendCommand(action, index) {
    iframe?.contentWindow?.postMessage({ type: "hono-decks:command", action, index }, "*");
  }

  function viewerClick(event) {
    const target = event.target;
    if (target instanceof HTMLButtonElement || target instanceof HTMLAnchorElement) return;
    const bounds = viewport?.getBoundingClientRect();
    if (!bounds) return;
    const action = event.clientX < bounds.left + bounds.width / 2 ? "previous" : "next";
    sendCommand(action);
  }

  function viewerPointerDown(event) {
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
  }

  function viewerPointerUp(event) {
    if (pointerStartX === null || pointerStartY === null) return;
    const deltaX = event.clientX - pointerStartX;
    const deltaY = event.clientY - pointerStartY;
    pointerStartX = null;
    pointerStartY = null;
    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY)) return;
    sendCommand(deltaX < 0 ? "next" : "previous");
  }

  async function toggleViewerFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen?.();
      return;
    }
    await root?.requestFullscreen?.();
  }

  document.querySelector("[data-action='previous']")?.addEventListener("click", () => sendCommand("previous"));
  document.querySelector("[data-action='next']")?.addEventListener("click", () => sendCommand("next"));
  document.querySelector("[data-action='fullscreen']")?.addEventListener("click", () => { void toggleViewerFullscreen(); });
  document.querySelectorAll("[data-action='goTo']").forEach((control) => {
    control.addEventListener("click", () => {
      const index = Number(control.getAttribute("data-slide-index"));
      if (Number.isFinite(index)) iframe?.contentWindow?.postMessage({ type: "hono-decks:command", action: "goTo", index }, "*");
    });
  });
  viewport?.addEventListener("click", viewerClick);
  viewport?.addEventListener("pointerdown", viewerPointerDown);
  viewport?.addEventListener("pointerup", viewerPointerUp);
  window.addEventListener("message", (event) => {
    const message = event.data;
    if (!message || message.type !== "hono-decks:state") return;
    root?.setAttribute("data-step-index", String(message.stepIndex ?? 0));
    root?.setAttribute("data-step-count", String(message.stepCount ?? 0));
    if (position) {
      const slideText = String(message.index + 1) + " / " + String(message.slideCount ?? "?");
      position.textContent = slideText;
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight" || event.key === " ") sendCommand("next");
    if (event.key === "ArrowLeft") sendCommand("previous");
    if (event.key === "f") void toggleViewerFullscreen();
  });
})();
  </script>`;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
