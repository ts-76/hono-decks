import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { renderCompiledDeckPageAsync } from "../renderer/compiled-render";
import { RenderError } from "../deck/model";
import type { CompiledDeck, DeckSource } from "../deck/model";
import type { SlideComponentInput, SlideComponentRegistry } from "../renderer/compiled-render";
import { serveDecksClientEntry } from "./client-entry";
import {
  isPdfExportEnabled,
  isPngExportEnabled,
  renderDeckBrowserExport,
  type DeckExportOptions,
} from "./browser-export";
import {
  createDeckViewerParts,
  renderDeckViewerPage,
  type DeckViewerBackLink,
  type DeckViewerBackLinkInput,
  type DeckPageMeta,
  type DeckTocItem,
  type DeckViewerOptions,
  type DeckViewerParts,
} from "./viewer";
import {
  extractAssetPath,
  inferMountPath,
  normalizeClientEntryAssetPath,
  resolveGeneratedClientEntryUrl,
  stripPathSuffix,
} from "./path-utils";

export type {
  DeckBrowserRunBinding,
  DeckBrowserRunPdfOptions,
  DeckBrowserRunPngOptions,
  DeckExportAuthorizeInput,
  DeckExportOptions,
} from "./browser-export";
export { createDeckViewerParts } from "./viewer";
export type {
  DeckViewerBackLink,
  DeckViewerBackLinkInput,
  DeckPageMeta,
  DeckTocItem,
  DeckViewerOptions,
  DeckViewerParts,
  DeckViewerRenderInput,
} from "./viewer";

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
  viewer?: Pick<DeckViewerOptions, "controls" | "backLink">;
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
      backLink: options.viewer?.backLink,
    });

    c.set("deck", deck);
    c.set("deckViewer", viewer);
    c.set("deckToc", viewer.slides);
    c.set("deckMeta", viewer.meta);
    await next();
  };
}

function isDevEnabled(options: DecksRouterOptions): boolean {
  return options.dev === true;
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

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
