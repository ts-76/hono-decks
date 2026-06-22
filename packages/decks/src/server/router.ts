import { Hono } from "hono";
import type { Context, MiddlewareHandler } from "hono";
import { jsx } from "hono/jsx/jsx-runtime";
import { renderCompiledDeckPageAsync } from "../renderer/compiled-render";
import { renderJsxValue } from "../renderer/jsx-renderer";
import { RenderError } from "../deck/model";
import type { CompiledDeck, DeckSource } from "../deck/model";
import type { DeckRenderable, MaybePromise } from "../renderer/compiled-render";
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
  components?: SlideComponentRegistry | Record<string, SlideComponentInput>;
  clientEntry?: string;
  clientEntryAsset?: string;
  clientEntryAssetPath?: string;
  viewer?: DeckViewerOptions;
  export?: DeckExportOptions;
}

export interface DeckViewerOptions {
  controls?: boolean;
  style?: string;
  head?: MaybePromise<DeckRenderable>;
  render?(input: DeckViewerRenderInput): MaybePromise<DeckRenderable>;
}

export interface DeckBrowserRunBinding {
  quickAction(action: "pdf" | "screenshot", input: Record<string, unknown>): MaybePromise<Response>;
}

export interface DeckBrowserRunPdfOptions {
  filename?: string | ((deck: CompiledDeck) => string);
  request?: Record<string, unknown>;
}

export interface DeckBrowserRunPngOptions {
  filename?: string | ((deck: CompiledDeck) => string);
  request?: Record<string, unknown>;
}

export interface DeckExportAuthorizeInput {
  deck: CompiledDeck;
  format: "pdf" | "png";
}

export interface DeckExportOptions {
  browser(c: Context): MaybePromise<DeckBrowserRunBinding | null | undefined>;
  authorize?(c: Context, input: DeckExportAuthorizeInput): MaybePromise<boolean>;
  pdf?: boolean | DeckBrowserRunPdfOptions;
  png?: boolean | DeckBrowserRunPngOptions;
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
  exportPdfPath?: string;
  exportPngPath?: string;
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

  if (isPdfExportEnabled(options.export)) {
    router.get("/:slug/export.pdf", async (c) => renderDeckBrowserExport(c, options, "pdf"));
  }

  if (isPngExportEnabled(options.export)) {
    router.get("/:slug/export.png", async (c) => renderDeckBrowserExport(c, options, "png"));
  }

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
        c,
        deck,
        mountPath,
        viewer: options.viewer,
        exportOptions: options.export,
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
  exportPaths?: DeckViewerExportPaths;
}): DeckViewerParts {
  const slug = input.deck.slug;
  const title = input.deck.meta.title ?? slug;
  const basePath = input.mountPath.replace(/\/$/, "");
  const canonicalPath = `${basePath}/${encodeURIComponent(slug)}`;
  const renderUrl = `${canonicalPath}/render`;
  const printPath = `${canonicalPath}/print`;
  const exportPdfPath = input.exportPaths?.pdf ? `${canonicalPath}/export.pdf` : undefined;
  const exportPngPath = input.exportPaths?.png ? `${canonicalPath}/export.png` : undefined;
  const slides = createDeckToc(input.deck);
  const meta: DeckPageMeta = {
    title,
    description: input.deck.meta.description,
    canonicalPath,
    renderPath: renderUrl,
    printPath,
    exportPdfPath,
    exportPngPath,
  };

  return {
    slug,
    title,
    renderUrl,
    frame: renderViewerFrame({ title, renderUrl }),
    frameHtml: renderViewerFrameHtml({ title, renderUrl }),
    controls: input.controls === false ? null : renderViewerControls(meta),
    controlsHtml: input.controls === false ? null : renderViewerControlsHtml(meta),
    toc: renderViewerToc(slides),
    tocHtml: renderViewerTocHtml(slides),
    slides,
    meta,
  };
}

interface DeckViewerExportPaths {
  pdf?: boolean;
  png?: boolean;
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

async function renderDeckBrowserExport(c: Context, options: DecksRouterOptions, format: "pdf" | "png"): Promise<Response> {
  const slug = c.req.param("slug");
  if (!slug) return c.json({ error: "Deck not found", slug: "" }, 404);
  const deck = await options.source.getCompiledDeck(c, slug);
  if (!deck || (!isDevEnabled(options) && deck.meta.draft)) return c.json({ error: "Deck not found", slug }, 404);

  const exportOptions = options.export;
  if (!exportOptions) return c.json({ error: "Browser export not configured", slug, format }, 503);
  if (!(await isBrowserExportAuthorized(c, exportOptions, deck, format))) {
    return c.json({ error: "Browser export not authorized", slug, format }, 403);
  }
  const browser = await exportOptions.browser(c);
  if (!browser) return c.json({ error: "Browser export not configured", slug, format }, 503);

  const mountPath = stripPathSuffix(c.req.path, `/${slug}/export.${format}`);
  const printUrl = new URL(`${mountPath}/${encodeURIComponent(slug)}/print`, c.req.url).toString();
  const action = format === "pdf" ? "pdf" : "screenshot";
  const response = await browser.quickAction(action, createBrowserRunExportRequest(exportOptions, deck, printUrl, format));
  const headers = new Headers(response.headers);
  if (!headers.has("content-type")) headers.set("content-type", format === "pdf" ? "application/pdf" : "image/png");
  headers.set("content-disposition", `attachment; filename="${exportFilename(exportOptions, deck, format)}"`);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function createBrowserRunExportRequest(
  options: DeckExportOptions,
  _deck: CompiledDeck,
  printUrl: string,
  format: "pdf" | "png",
): Record<string, unknown> {
  if (format === "pdf") {
    const request = exportOptionObject(options.pdf).request ?? {};
    return {
      ...request,
      url: printUrl,
      gotoOptions: {
        waitUntil: "networkidle2",
        timeout: 45000,
        ...recordValue(request.gotoOptions),
      },
      pdfOptions: {
        format: "a4",
        printBackground: true,
        preferCSSPageSize: true,
        ...recordValue(request.pdfOptions),
      },
    };
  }

  const request = exportOptionObject(options.png).request ?? {};
  return {
    ...request,
    url: printUrl,
    gotoOptions: {
      waitUntil: "networkidle2",
      timeout: 45000,
      ...recordValue(request.gotoOptions),
    },
    viewport: {
      width: 794,
      height: 1123,
      deviceScaleFactor: 2,
      ...recordValue(request.viewport),
    },
    screenshotOptions: {
      type: "png",
      fullPage: true,
      ...recordValue(request.screenshotOptions),
    },
  };
}

function isPdfExportEnabled(options: DeckExportOptions | undefined): boolean {
  return options?.pdf !== undefined && options.pdf !== false;
}

function isPngExportEnabled(options: DeckExportOptions | undefined): boolean {
  return options?.png !== undefined && options.png !== false;
}

async function isBrowserExportAuthorized(
  c: Context,
  options: DeckExportOptions,
  deck: CompiledDeck,
  format: "pdf" | "png",
): Promise<boolean> {
  return options.authorize ? options.authorize(c, { deck, format }) : true;
}

async function resolveAuthorizedExportPaths(
  c: Context,
  deck: CompiledDeck,
  options: DeckExportOptions | undefined,
): Promise<DeckViewerExportPaths> {
  if (!options) return {};
  const pdf = isPdfExportEnabled(options) && (await isBrowserExportAuthorized(c, options, deck, "pdf"));
  const png = isPngExportEnabled(options) && (await isBrowserExportAuthorized(c, options, deck, "png"));
  return { pdf, png };
}

function exportFilename(options: DeckExportOptions, deck: CompiledDeck, format: "pdf" | "png"): string {
  const option = exportOptionObject(format === "pdf" ? options.pdf : options.png);
  const name = typeof option.filename === "function" ? option.filename(deck) : option.filename;
  return `${safeFilename(name ?? deck.meta.title ?? deck.slug)}.${format}`;
}

function exportOptionObject(
  option: boolean | DeckBrowserRunPdfOptions | DeckBrowserRunPngOptions | undefined,
): DeckBrowserRunPdfOptions | DeckBrowserRunPngOptions {
  return typeof option === "object" && option ? option : {};
}

function recordValue(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
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
  c: Context;
  deck: CompiledDeck;
  mountPath: string;
  viewer?: DeckViewerOptions;
  exportOptions?: DeckExportOptions;
}): Promise<string> {
  const parts = createDeckViewerParts({
    deck: input.deck,
    mountPath: input.mountPath,
    controls: input.viewer?.controls,
    exportPaths: await resolveAuthorizedExportPaths(input.c, input.deck, input.exportOptions),
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

function renderViewerControls(meta: DeckPageMeta): DeckRenderable {
  const exportLinks = [
    meta.exportPdfPath
      ? jsx("a", {
          href: meta.exportPdfPath,
          download: `${safeFilename(meta.title)}.pdf`,
          "data-hono-decks-export": "pdf",
          children: "PDF",
        })
      : null,
    meta.exportPngPath
      ? jsx("a", {
          href: meta.exportPngPath,
          download: `${safeFilename(meta.title)}.png`,
          "data-hono-decks-export": "png",
          children: "PNG",
        })
      : null,
  ].filter(Boolean);

  return jsx("nav", {
    class: "hono-decks-viewer-controls",
    "data-hono-decks-viewer-controls": true,
    "aria-label": "Viewer controls",
    children: [
      jsx("button", { type: "button", "data-action": "previous", children: "Prev" }),
      jsx("span", { "data-slide-position": true, children: "1 / ?" }),
      jsx("button", { type: "button", "data-action": "next", children: "Next" }),
      jsx("button", { type: "button", "data-action": "fullscreen", children: "Full" }),
      ...exportLinks,
    ],
  });
}

function renderViewerControlsHtml(meta: DeckPageMeta): string {
  const exportLinks = [
    meta.exportPdfPath
      ? `<a href="${escapeHtml(meta.exportPdfPath)}" download="${escapeHtml(safeFilename(meta.title))}.pdf" data-hono-decks-export="pdf">PDF</a>`
      : "",
    meta.exportPngPath
      ? `<a href="${escapeHtml(meta.exportPngPath)}" download="${escapeHtml(safeFilename(meta.title))}.png" data-hono-decks-export="png">PNG</a>`
      : "",
  ].join("");
  return `<nav class="hono-decks-viewer-controls" data-hono-decks-viewer-controls aria-label="Viewer controls"><button type="button" data-action="previous">Prev</button><span data-slide-position>1 / ?</span><button type="button" data-action="next">Next</button><button type="button" data-action="fullscreen">Full</button>${exportLinks}</nav>`;
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
.hono-decks-frame-stage iframe{width:100%;height:100%;border:0;display:block}
.hono-decks-viewer-controls{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);display:flex;gap:8px;align-items:center}
.hono-decks-viewer-toc button,.hono-decks-viewer-controls button,.hono-decks-viewer-controls a{font:inherit}
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

function safeFilename(value: string): string {
  const normalized = value
    .trim()
    .replaceAll(/[^a-zA-Z0-9._-]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
  return normalized || "deck";
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
