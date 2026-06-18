import { Hono } from "hono";
import { renderCompiledDeckPage } from "../renderer/compiled-render";
import type { DeckSource } from "../deck/model";

export interface HonoSlidesRouterExtension {
  path: string;
  router: Hono;
}

export interface HonoSlidesRouterOptions {
  source: DeckSource;
  dev?: boolean;
  extensions?: HonoSlidesRouterExtension[];
  liveReloadPath?(slug: string, mountPath: string): string | undefined;
  style?: string;
}

export function honoSlidesRouter(options: HonoSlidesRouterOptions): Hono {
  const router = new Hono();

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
    return c.html(
      renderCompiledDeckPage({
        deck,
        mountPath,
        style: options.style,
        liveReloadPath: isDevEnabled(options) ? options.liveReloadPath?.(slug, mountPath) : undefined,
      }),
    );
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
      renderDeckViewerPage({
        slug,
        title: deck.meta.title ?? slug,
        mountPath,
      }),
    );
  });

  return router;
}

function isDevEnabled(options: HonoSlidesRouterOptions): boolean {
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
  <title>Hono Slides</title>
</head>
<body>
  <main>
    <h1>Hono Slides</h1>
    <ul>${items}</ul>
  </main>
</body>
</html>`;
}

function renderDeckViewerPage(input: { slug: string; title: string; mountPath: string }): string {
  const renderUrl = `${input.mountPath}/${encodeURIComponent(input.slug)}/render`;
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.title)}</title>
  <style>
    :root { color-scheme: dark; background: #050816; color: #eef2ff; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
    body { margin: 0; min-height: 100vh; overflow: hidden; }
    [data-hono-slides-viewer] { min-height: 100vh; display: grid; place-items: center; gap: 16px; padding: 16px; box-sizing: border-box; background: radial-gradient(circle at top, #1e2b5c, #050816 62%); }
    .hono-slides-viewer-stage { display: grid; place-items: center; min-width: 0; min-height: 0; }
    .hono-slides-viewport { width: min(100vw, calc(100vh * 16 / 9)); height: min(100vh, calc(100vw * 9 / 16)); position: relative; overflow: hidden; }
    .hono-slides-frame-stage { width: 1920px; height: 1080px; transform-origin: top left; }
    iframe { width: 1920px; height: 1080px; border: 0; display: block; background: #0b1020; }
    .hono-slides-viewer-controls { position: fixed; left: 50%; bottom: 20px; transform: translateX(-50%); display: flex; gap: 8px; align-items: center; padding: 8px 10px; border-radius: 999px; background: rgba(5, 8, 22, .72); backdrop-filter: blur(12px); }
    .hono-slides-viewer-controls button, .hono-slides-viewer-controls a { border: 1px solid rgba(255,255,255,.22); border-radius: 999px; background: rgba(255,255,255,.1); color: inherit; padding: 8px 12px; cursor: pointer; font: inherit; text-decoration: none; }
  </style>
</head>
<body>
  <main data-hono-slides-viewer data-deck-slug="${escapeHtml(input.slug)}">
    <div class="hono-slides-viewer-stage">
      <div class="hono-slides-viewport" data-viewer-viewport>
        <div class="hono-slides-frame-stage" data-viewer-stage>
          <iframe title="${escapeHtml(input.title)}" src="${escapeHtml(renderUrl)}" width="1920" height="1080"></iframe>
        </div>
      </div>
      <nav class="hono-slides-viewer-controls" aria-label="Viewer controls">
        <button type="button" data-action="previous">Prev</button>
        <span data-slide-position>1 / ?</span>
        <button type="button" data-action="next">Next</button>
        <button type="button" data-action="fullscreen">Full</button>
      </nav>
    </div>
  </main>
  <script>
(() => {
  const root = document.querySelector("[data-hono-slides-viewer]");
  const viewport = document.querySelector("[data-viewer-viewport]");
  const stage = document.querySelector("[data-viewer-stage]");
  const iframe = document.querySelector("iframe");
  const position = document.querySelector("[data-slide-position]");
  const DESIGN_WIDTH = 1920;
  const DESIGN_HEIGHT = 1080;
  let activeSlideIndex = 0;
  function resize() {
    if (!viewport || !stage) return;
    const bounds = viewport.parentElement?.getBoundingClientRect();
    const availableWidth = bounds?.width || window.innerWidth;
    const availableHeight = bounds?.height || window.innerHeight;
    const scale = Math.min(availableWidth / DESIGN_WIDTH, availableHeight / DESIGN_HEIGHT);
    stage.style.transform = "scale(" + scale + ")";
    viewport.style.width = String(DESIGN_WIDTH * scale) + "px";
    viewport.style.height = String(DESIGN_HEIGHT * scale) + "px";
  }

  function sendCommand(action) {
    iframe?.contentWindow?.postMessage({ type: "hono-slides:command", action }, "*");
  }

  function viewerClick(event) {
    const target = event.target;
    if (target instanceof HTMLButtonElement || target instanceof HTMLAnchorElement) return;
    const bounds = viewport?.getBoundingClientRect();
    if (!bounds) return;
    const action = event.clientX < bounds.left + bounds.width / 2 ? "previous" : "next";
    sendCommand(action);
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
  viewport?.addEventListener("click", viewerClick);
  window.addEventListener("resize", resize);
  window.addEventListener("message", (event) => {
    const message = event.data;
    if (!message || message.type !== "hono-slides:state") return;
    activeSlideIndex = message.index;
    if (position) position.textContent = String(message.index + 1) + " / " + String(message.slideCount ?? "?");
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight" || event.key === " ") sendCommand("next");
    if (event.key === "ArrowLeft") sendCommand("previous");
    if (event.key === "f") void toggleViewerFullscreen();
  });
  resize();
})();
  </script>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
