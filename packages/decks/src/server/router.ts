import { Hono } from "hono";
import type { Context, MiddlewareHandler } from "hono";
import { renderCompiledDeckPageAsync } from "../renderer/compiled-render";
import type { MaybePromise } from "../renderer/compiled-render";
import { renderPresenterPageAsync } from "../renderer/presentation-page";
import { RenderError } from "../deck/model";
import type { CompiledDeck, DeckSource } from "../deck/model";
import type { SlideComponentInput, SlideComponentRegistry } from "../renderer/compiled-render";
import type { DeckControlIconName } from "../renderer/control-icons";
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
  type DeckViewerControlDefaults,
  type DeckViewerControlItem,
  type DeckViewerControlKey,
  type DeckViewerControlItemRenderer,
  type DeckViewerControlRenderInput,
  type DeckViewerControlSlotItems,
  type DeckViewerControlsContext,
  type DeckViewerControlsItemsResolver,
  type DeckViewerControlsOptions,
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
  DeckViewerExportPaths,
} from "./browser-export";
export { createDeckViewerParts } from "./viewer";
export type {
  DeckViewerControlDefaults,
  DeckViewerControlItem,
  DeckViewerControlKey,
  DeckViewerControlItemRenderer,
  DeckViewerControlRenderInput,
  DeckViewerControlSlotItems,
  DeckViewerControlsContext,
  DeckViewerControlsItemsResolver,
  DeckViewerControlsOptions,
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
  dev?: boolean | DeckDevResolver;
  extensions?: DecksRouterExtension[];
  liveReloadPath?(slug: string, mountPath: string): string | undefined;
  style?: string;
  components?: SlideComponentRegistry | Record<string, SlideComponentInput>;
  clientEntry?: string;
  clientEntryAsset?: string;
  clientEntryAssetPath?: string;
  viewer?: DeckViewerOptions;
  presenter?: false | DecksRouterPresenterOptions;
  export?: DeckExportOptions;
}

export type DeckDevResolver = (c: Context) => MaybePromise<boolean>;

export interface DecksRouterPresenterOptions {
  enabled?: boolean | DeckPresenterEnabledResolver;
  viewerControl?: boolean | DeckPresenterViewerControlOptions;
}

export type DeckPresenterEnabledResolver = (input: DeckPresenterEnabledInput) => MaybePromise<boolean>;

export interface DeckPresenterEnabledInput {
  c: Context;
  deck: CompiledDeck;
  slug: string;
  mountPath: string;
  dev: boolean;
  presenterPath: string;
  presentationPath: string;
}

export interface DeckPresenterViewerControlOptions {
  key?: string;
  label?: string;
  icon?: DeckControlIconName;
  className?: string;
  attributes?: Record<string, string | boolean | undefined>;
  placement?: "before" | "after";
}

export interface DeckContextVariables {
  deck: CompiledDeck;
  deckViewer: DeckViewerParts;
  deckToc: DeckTocItem[];
  deckMeta: DeckPageMeta;
}

export interface DeckContextOptions {
  source: DeckSource;
  dev?: boolean | DeckDevResolver;
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
    const dev = await isDevEnabled(c, options);
    const decks = (await options.source.listDecks(c)).filter((deck) => dev || !deck.draft);
    return c.html(renderDeckIndex(decks, c.req.path));
  });

  router.get("/:slug/assets/*", async (c) => {
    const slug = c.req.param("slug");
    const assetPath = extractAssetPath(c.req.path, slug);
    const deck = await options.source.getCompiledDeck(c, slug);
    if (!deck || (!(await isDevEnabled(c, options)) && deck.meta.draft)) {
      return c.json({ error: "Asset not found", slug, assetPath }, 404);
    }
    const response = await options.source.getAsset?.(c, slug, assetPath);
    if (!response) return c.json({ error: "Asset not found", slug, assetPath }, 404);
    return response;
  });

  router.get("/:slug/render", async (c) => {
    const slug = c.req.param("slug");
    const deck = await options.source.getCompiledDeck(c, slug);
    const dev = await isDevEnabled(c, options);
    if (!deck || (!dev && deck.meta.draft)) return c.json({ error: "Deck not found", slug }, 404);
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
          liveReloadPath: dev ? options.liveReloadPath?.(slug, mountPath) : undefined,
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
    if (!deck || (!(await isDevEnabled(c, options)) && deck.meta.draft)) return c.json({ error: "Deck not found", slug }, 404);
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
    router.get("/:slug/export.pdf", async (c) =>
      renderDeckBrowserExport(c, { ...options, dev: await isDevEnabled(c, options) }, "pdf"),
    );
  }

  if (isPngExportEnabled(options.export)) {
    router.get("/:slug/export.png", async (c) =>
      renderDeckBrowserExport(c, { ...options, dev: await isDevEnabled(c, options) }, "png"),
    );
  }

  router.get("/:slug/presentation", async (c) => {
    const slug = c.req.param("slug");
    const deck = await options.source.getCompiledDeck(c, slug);
    const dev = await isDevEnabled(c, options);
    if (!deck || (!dev && deck.meta.draft)) return c.json({ error: "Deck not found", slug }, 404);
    const mountPath = stripPathSuffix(c.req.path, `/${slug}/presentation`);
    const clientEntry = options.clientEntry ?? resolveGeneratedClientEntryUrl(options, mountPath);
    try {
      return c.html(
        await renderCompiledDeckPageAsync({
          deck,
          mountPath,
          style: options.style,
          components: options.components,
          clientEntry,
          speakerNotes: false,
          liveReloadPath: dev ? options.liveReloadPath?.(slug, mountPath) : undefined,
        }),
      );
    } catch (error) {
      const message =
        error instanceof RenderError ? error.message : `Render failed in ${deck.sourcePath}: ${formatErrorMessage(error)}`;
      return c.text(message, 500);
    }
  });

  router.get("/:slug/presenter", async (c) => {
    const slug = c.req.param("slug");
    const deck = await options.source.getCompiledDeck(c, slug);
    if (!deck || (!(await isDevEnabled(c, options)) && deck.meta.draft)) return c.json({ error: "Deck not found", slug }, 404);
    const mountPath = stripPathSuffix(c.req.path, `/${slug}/presenter`);
    if (!(await isPresenterEnabled(c, options, deck, slug, mountPath))) {
      return c.json({ error: "Presenter route not found", slug }, 404);
    }
    try {
      return c.html(
        await renderPresenterPageAsync({
          deck,
          mountPath,
          presenterStateQuery: paginationQueryFromRequest(c),
          style: options.style,
          components: options.components,
        }),
      );
    } catch (error) {
      const message =
        error instanceof RenderError ? error.message : `Render failed in ${deck.sourcePath}: ${formatErrorMessage(error)}`;
      return c.text(message, 500);
    }
  });

  router.get("/:slug", async (c) => {
    const slug = c.req.param("slug");
    const deck = await options.source.getCompiledDeck(c, slug);
    if (!deck || (!(await isDevEnabled(c, options)) && deck.meta.draft)) return c.json({ error: "Deck not found", slug }, 404);
    const mountPath = stripPathSuffix(c.req.path, `/${slug}`);
    return c.html(
      await renderDeckViewerPage({
        c,
        deck,
        mountPath,
        viewerStateQuery: paginationQueryFromRequest(c),
        viewer: {
          ...options.viewer,
          controls: await resolveViewerControls(c, options, deck, slug, mountPath),
        },
        exportOptions: options.export,
      }),
    );
  });

  return router;
}

function paginationQueryFromRequest(c: Context): string {
  const source = new URL(c.req.url);
  const params = new URLSearchParams();
  const slide = positiveIntegerParam(source.searchParams.get("slide"));
  const step = nonNegativeIntegerParam(source.searchParams.get("step"));
  if (slide !== undefined) params.set("slide", String(slide));
  if (step !== undefined) params.set("step", String(step));
  const query = params.toString();
  return query ? `?${query}` : "";
}

function positiveIntegerParam(value: string | null): number | undefined {
  if (value === null) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function nonNegativeIntegerParam(value: string | null): number | undefined {
  if (value === null) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

export function deckContext(options: DeckContextOptions): MiddlewareHandler<{ Variables: DeckContextVariables }> {
  return async (c, next) => {
    const slug = c.req.param("slug");
    if (!slug) return c.json({ error: "Deck not found", slug: "" }, 404);
    const deck = await options.source.getCompiledDeck(c, slug);
    if (!deck || (!(await isDevEnabled(c, options)) && deck.meta.draft)) return c.json({ error: "Deck not found", slug }, 404);
    const mountPath = options.mountPath ?? inferMountPath(c.req.path, slug);
    const viewer = await createDeckViewerParts({
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

async function isDevEnabled(c: Context, options: Pick<DecksRouterOptions, "dev">): Promise<boolean> {
  if (typeof options.dev === "function") return Boolean(await options.dev(c));
  return options.dev === true;
}

async function resolveViewerControls(
  c: Context,
  options: DecksRouterOptions,
  deck: CompiledDeck,
  slug: string,
  mountPath: string,
): Promise<false | DeckViewerControlsOptions | undefined> {
  const controls = options.viewer?.controls;
  if (controls === false) return false;
  const presenterControl = await resolvePresenterViewerControl(c, options, deck, slug, mountPath);
  if (!presenterControl) return controls;

  const nextControls: DeckViewerControlsOptions = controls ? { ...controls } : {};
  if (nextControls.items) return nextControls;

  const placement = presenterControl.placement ?? "after";
  const item = presenterControl.item;
  if (placement === "before") {
    nextControls.before = mergeControlSlotItems(nextControls.before, item, "before");
  } else {
    nextControls.after = mergeControlSlotItems(nextControls.after, item, "after");
  }
  return nextControls;
}

async function resolvePresenterViewerControl(
  c: Context,
  options: DecksRouterOptions,
  deck: CompiledDeck,
  slug: string,
  mountPath: string,
): Promise<{ item: Exclude<DeckViewerControlItem, null | false | undefined>; placement: "before" | "after" } | null> {
  const presenter = options.presenter;
  if (!presenter || !presenter.viewerControl) return null;
  if (!(await isPresenterEnabled(c, options, deck, slug, mountPath))) return null;

  const control = presenter.viewerControl === true ? {} : presenter.viewerControl;
  const presenterPath = presenterRoutePath(mountPath, slug);
  return {
    item: {
      type: "link",
      key: control.key ?? "presenter",
      href: presenterPath,
      label: control.label ?? "Presenter",
      icon: control.icon ?? "presenter",
      className: control.className,
      attributes: control.attributes,
    },
    placement: control.placement ?? "after",
  };
}

function mergeControlSlotItems(
  slot: DeckViewerControlSlotItems | undefined,
  item: Exclude<DeckViewerControlItem, null | false | undefined>,
  placement: "before" | "after",
): DeckViewerControlSlotItems {
  if (!slot) return [item];
  if (Array.isArray(slot)) return placement === "before" ? [item, ...slot] : [...slot, item];
  return (context) => {
    const items = slot(context);
    return placement === "before" ? [item, ...items] : [...items, item];
  };
}

async function isPresenterEnabled(
  c: Context,
  options: DecksRouterOptions,
  deck: CompiledDeck,
  slug: string,
  mountPath: string,
): Promise<boolean> {
  const presenter = options.presenter;
  if (presenter === false) return false;

  const enabled = presenter?.enabled;
  if (enabled === undefined) return true;
  if (typeof enabled === "boolean") return enabled;

  return Boolean(
    await enabled({
      c,
      deck,
      slug,
      mountPath: mountPath.replace(/\/$/, ""),
      dev: await isDevEnabled(c, options),
      presenterPath: presenterRoutePath(mountPath, slug),
      presentationPath: presentationRoutePath(mountPath, slug),
    }),
  );
}

function presenterRoutePath(mountPath: string, slug: string): string {
  return `${mountPath.replace(/\/$/, "")}/${encodeURIComponent(slug)}/presenter`;
}

function presentationRoutePath(mountPath: string, slug: string): string {
  return `${mountPath.replace(/\/$/, "")}/${encodeURIComponent(slug)}/presentation`;
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
