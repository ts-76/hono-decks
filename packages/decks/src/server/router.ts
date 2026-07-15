import { Hono } from "hono";
import type { Context, Env, MiddlewareHandler } from "hono";
import { raw } from "hono/html";
import { renderCompiledDeckPageAsync } from "../renderer/compiled-render";
import type { DeckRenderable, MaybePromise } from "../renderer/compiled-render";
import { renderJsxValue } from "../renderer/jsx-renderer";
import { renderPresenterPageAsync } from "../renderer/presentation-page";
import { RenderError } from "../deck/model";
import type { CompiledDeck, DeckEntry, DeckSource } from "../deck/model";
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
  type DeckViewerDefaultControlItem,
  type DeckViewerControlItem,
  type DeckViewerControlKey,
  type DeckViewerControlItemRenderer,
  type DeckViewerControlRenderInput,
  type DeckViewerControlSlotItems,
  type DeckViewerControlsContext,
  type DeckViewerControlsItemsResolver,
  type DeckViewerControlsOptions,
  type DeckViewerLinkControlItem,
  type DeckPageMeta,
  type DeckTocItem,
  type DeckViewerOptions,
  type DeckViewerOpenGraphInput,
  type DeckViewerOpenGraphOptions,
  type DeckViewerPart,
  type DeckViewerParts,
  type DeckViewerRenderControlItem,
} from "./viewer";
import {
  extractAssetPath,
  inferMountPath,
  normalizeClientEntryAssetPath,
  resolveGeneratedClientEntryUrl,
  stripPathSuffix,
} from "./path-utils";
import { createDeckPaths } from "./paths";
import { resolveDeckDocument, type DeckDocumentOptions, type ResolvedDeckDocument } from "./document";
import {
  renderDeckExternalEmbedResponse,
  type DeckExternalEmbedOptions,
} from "./external-embed";

export type {
  DeckBrowserRunBinding,
  DeckBrowserRunPdfOptions,
  DeckBrowserRunPngOptions,
  DeckExportResolverInput,
  DeckExportOptions,
  DeckViewerExportPaths,
} from "./browser-export";
export type {
  DeckDocumentOptions,
  DeckDocumentPageOptions,
  DeckDocumentRenderInput,
  DeckDocumentSurface,
  ResolvedDeckDocument,
} from "./document";
export type {
  DeckExternalEmbedContext,
  DeckExternalEmbedOptions,
  DeckExternalEmbedRenderInput,
  DeckExternalEmbedViewerOptions,
} from "./external-embed";
export { createDeckViewerEmbed, createDeckViewerParts } from "./viewer";
export type {
  DeckViewerEmbed,
  DeckViewerEmbedOptions,
  DeckViewerControlDefaults,
  DeckViewerDefaultControlItem,
  DeckViewerControlItem,
  DeckViewerControlKey,
  DeckViewerControlItemRenderer,
  DeckViewerControlRenderInput,
  DeckViewerControlSlotItems,
  DeckViewerControlsContext,
  DeckViewerControlsItemsResolver,
  DeckViewerControlsOptions,
  DeckViewerLinkControlItem,
  DeckPageMeta,
  DeckTocItem,
  DeckViewerOptions,
  DeckViewerOpenGraphInput,
  DeckViewerOpenGraphOptions,
  DeckViewerPart,
  DeckViewerParts,
  DeckViewerRenderControlItem,
  DeckViewerRenderInput,
} from "./viewer";

export interface DecksRouterExtension<E extends Env = any> {
  path: string;
  router: Hono<E>;
}

export interface DecksRouterOptions<E extends Env = any> {
  source: DeckSource<E>;
  /**
   * Enables development-only deck behavior. When omitted, Vite and Wrangler
   * development commands are detected from NODE_ENV. Explicit values and
   * resolvers always take precedence.
   */
  dev?: boolean | DeckDevResolver<E>;
  extensions?: DecksRouterExtension<E>[];
  liveReloadPath?(slug: string, mountPath: string): string | undefined;
  style?: string;
  components?: SlideComponentRegistry | Record<string, SlideComponentInput>;
  clientEntry?: string;
  clientEntryAsset?: string;
  clientEntryAssetPath?: string;
  document?: DeckDocumentOptions<E>;
  pages?: DecksRouterPagesOptions<E>;
  embed?: false | DeckExternalEmbedOptions<E>;
  viewer?: DeckViewerOptions<E>;
  presenter?: false | DecksRouterPresenterOptions<E>;
  export?: false | DeckExportOptions<E>;
}

export type DeckRouteSurface = "index" | "viewer" | "render" | "print" | "presentation" | "presenter";

export interface DeckRouteSurfaceInput<E extends Env = any> {
  c: Context<E>;
  surface: DeckRouteSurface;
  mountPath: string;
  dev: boolean;
  deck?: CompiledDeck;
  slug?: string;
}

export type DeckRouteEnabledResolver<E extends Env = any> =
  (input: DeckRouteSurfaceInput<E>) => MaybePromise<boolean>;

export type DeckRouteEnabled<E extends Env = any> = boolean | DeckRouteEnabledResolver<E>;

export interface DeckIndexPageInput<E extends Env = any> extends DeckRouteSurfaceInput<E> {
  surface: "index";
  decks: DeckEntry[];
}

export interface DeckIndexRenderInput<E extends Env = any> extends DeckIndexPageInput<E> {
  title: string;
  document: ResolvedDeckDocument;
  defaultContent: DeckRenderable;
}

export interface DeckIndexPageOptions<E extends Env = any> {
  enabled?: DeckRouteEnabled<E>;
  title?: string | ((input: DeckIndexPageInput<E>) => MaybePromise<string>);
  render?(input: DeckIndexRenderInput<E>): MaybePromise<DeckRenderable>;
}

export interface DecksRouterPagesOptions<E extends Env = any> {
  index?: false | DeckIndexPageOptions<E>;
  viewer?: DeckRouteEnabled<E>;
  render?: DeckRouteEnabled<E>;
  print?: DeckRouteEnabled<E>;
  presentation?: DeckRouteEnabled<E>;
  presenter?: DeckRouteEnabled<E>;
}

/** Request data passed to the development-mode resolver. */
export interface DeckDevResolverInput<E extends Env = any> {
  c: Context<E>;
}

export type DeckDevResolver<E extends Env = any> = (input: DeckDevResolverInput<E>) => MaybePromise<boolean>;

export interface DecksRouterPresenterOptions<E extends Env = any> {
  enabled?: boolean | DeckPresenterEnabledResolver<E>;
  viewerControl?: boolean | DeckPresenterViewerControlOptions;
}

export type DeckPresenterEnabledResolver<E extends Env = any> =
  (input: DeckPresenterEnabledInput<E>) => MaybePromise<boolean>;

export interface DeckPresenterEnabledInput<E extends Env = any> {
  c: Context<E>;
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

export interface DeckContextOptions<E extends Env = any> {
  source: DeckSource<E>;
  dev?: boolean | DeckDevResolver<E>;
  mountPath?: string;
  viewer?: Pick<DeckViewerOptions<E>, "controls" | "openGraph">;
}

export function decksRouter<E extends Env = any>(options: DecksRouterOptions<E>): Hono<E> {
  const router = new Hono<E>();

  if (options.clientEntryAsset) {
    router.get(normalizeClientEntryAssetPath(options.clientEntryAssetPath), serveDecksClientEntry(options.clientEntryAsset));
  }

  for (const extension of options.extensions ?? []) {
    router.route(extension.path, extension.router);
  }

  router.get("/", async (c) => {
    const dev = await isDevEnabled(c, options);
    const decks = (await options.source.listDecks(c)).filter((deck) => dev || !deck.draft);
    const mountPath = c.req.path.replace(/\/$/, "");
    const pageInput: DeckIndexPageInput<E> = { c, surface: "index", mountPath, dev, decks };
    if (!(await isPageSurfaceEnabled(options, pageInput))) {
      return c.json({ error: "Deck index not found" }, 404);
    }
    const indexOptions = options.pages?.index === false ? undefined : options.pages?.index;
    const title = await resolveIndexTitle(indexOptions?.title, pageInput);
    const document = await resolveRouterDocument(c, options, "index", mountPath, undefined, title);
    const defaultContentHtml = renderDeckIndexContent(decks, mountPath);
    const defaultContent = raw(defaultContentHtml);
    const content = indexOptions?.render
      ? await renderJsxValue(indexOptions.render({ ...pageInput, title, document, defaultContent }))
      : defaultContentHtml;
    return c.html(renderDeckIndex(content, title, document));
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
    if (!(await isPageSurfaceEnabled(options, { c, surface: "render", mountPath, dev, deck, slug }))) {
      return c.json({ error: "Deck route not found", slug, surface: "render" }, 404);
    }
    const clientEntry = options.clientEntry ?? resolveGeneratedClientEntryUrl(options, mountPath);
    try {
      const document = await resolveRouterDocument(c, options, "render", mountPath, deck);
      return c.html(
        await renderCompiledDeckPageAsync({
          deck,
          mountPath,
          style: options.style,
          components: options.components,
          clientEntry,
          liveReloadPath: dev ? options.liveReloadPath?.(slug, mountPath) : undefined,
          document,
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
    const dev = await isDevEnabled(c, options);
    if (!deck || (!dev && deck.meta.draft)) return c.json({ error: "Deck not found", slug }, 404);
    const mountPath = stripPathSuffix(c.req.path, `/${slug}/print`);
    if (!(await isPageSurfaceEnabled(options, { c, surface: "print", mountPath, dev, deck, slug }))) {
      return c.json({ error: "Deck route not found", slug, surface: "print" }, 404);
    }
    try {
      const document = await resolveRouterDocument(c, options, "print", mountPath, deck);
      return c.html(
        await renderCompiledDeckPageAsync({
          deck,
          mountPath,
          style: options.style,
          components: options.components,
          printPreview: true,
          document,
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

  const embedOptions = options.embed;
  if (embedOptions) {
    router.get("/:slug/embed", async (c) => {
      const slug = c.req.param("slug");
      const deck = await options.source.getCompiledDeck(c, slug);
      if (!deck || (!(await isDevEnabled(c, options)) && deck.meta.draft)) {
        return c.json({ error: "Deck not found", slug }, 404);
      }
      const mountPath = stripPathSuffix(c.req.path, `/${slug}/embed`);
      return renderDeckExternalEmbedResponse({
        context: { c, deck, slug, mountPath },
        options: embedOptions,
        document: options.document,
      });
    });
  }

  router.get("/:slug/presentation", async (c) => {
    const slug = c.req.param("slug");
    const deck = await options.source.getCompiledDeck(c, slug);
    const dev = await isDevEnabled(c, options);
    if (!deck || (!dev && deck.meta.draft)) return c.json({ error: "Deck not found", slug }, 404);
    const mountPath = stripPathSuffix(c.req.path, `/${slug}/presentation`);
    if (!(await isPageSurfaceEnabled(options, { c, surface: "presentation", mountPath, dev, deck, slug }))) {
      return c.json({ error: "Deck route not found", slug, surface: "presentation" }, 404);
    }
    const clientEntry = options.clientEntry ?? resolveGeneratedClientEntryUrl(options, mountPath);
    try {
      const document = await resolveRouterDocument(c, options, "presentation", mountPath, deck);
      return c.html(
        await renderCompiledDeckPageAsync({
          deck,
          mountPath,
          style: options.style,
          components: options.components,
          clientEntry,
          speakerNotes: false,
          liveReloadPath: dev ? options.liveReloadPath?.(slug, mountPath) : undefined,
          document,
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
    const dev = await isDevEnabled(c, options);
    if (!deck || (!dev && deck.meta.draft)) return c.json({ error: "Deck not found", slug }, 404);
    const mountPath = stripPathSuffix(c.req.path, `/${slug}/presenter`);
    if (!(await isPageSurfaceEnabled(options, { c, surface: "presenter", mountPath, dev, deck, slug }))) {
      return c.json({ error: "Presenter route not found", slug }, 404);
    }
    if (!(await isPresenterEnabled(c, options, deck, slug, mountPath))) {
      return c.json({ error: "Presenter route not found", slug }, 404);
    }
    try {
      const document = await resolveRouterDocument(c, options, "presenter", mountPath, deck);
      return c.html(
        await renderPresenterPageAsync({
          deck,
          mountPath,
          presenterStateQuery: paginationQueryFromRequest(c),
          style: options.style,
          components: options.components,
          document,
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
    const dev = await isDevEnabled(c, options);
    if (!deck || (!dev && deck.meta.draft)) return c.json({ error: "Deck not found", slug }, 404);
    const mountPath = stripPathSuffix(c.req.path, `/${slug}`);
    if (!(await isPageSurfaceEnabled(options, { c, surface: "viewer", mountPath, dev, deck, slug }))) {
      return c.json({ error: "Deck route not found", slug, surface: "viewer" }, 404);
    }
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
        document: options.document,
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

export function deckContext<E extends Env = any>(
  options: DeckContextOptions<E>,
): MiddlewareHandler<E & { Variables: DeckContextVariables }> {
  return async (c, next) => {
    const slug = c.req.param("slug");
    if (!slug) return c.json({ error: "Deck not found", slug: "" }, 404);
    const sourceContext = c as unknown as Context<E>;
    const deck = await options.source.getCompiledDeck(sourceContext, slug);
    if (!deck || (!(await isDevEnabled(sourceContext, options)) && deck.meta.draft)) return c.json({ error: "Deck not found", slug }, 404);
    const mountPath = options.mountPath ?? inferMountPath(c.req.path, slug);
    const viewer = await createDeckViewerParts({
      deck,
      mountPath,
      controls: options.viewer?.controls,
      openGraph: options.viewer?.openGraph,
    });

    c.set("deck", deck);
    c.set("deckViewer", viewer);
    c.set("deckToc", viewer.slides);
    c.set("deckMeta", viewer.meta);
    await next();
  };
}

async function isDevEnabled<E extends Env>(
  c: Context<E>,
  options: Pick<DecksRouterOptions<E>, "dev">,
): Promise<boolean> {
  if (typeof options.dev === "function") return Boolean(await options.dev({ c }));
  if (typeof options.dev === "boolean") return options.dev;
  return inferToolchainDevMode();
}

function inferToolchainDevMode(): boolean {
  try {
    return process.env.NODE_ENV === "development";
  } catch {
    return false;
  }
}

async function resolveViewerControls<E extends Env>(
  c: Context<E>,
  options: DecksRouterOptions<E>,
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

async function resolvePresenterViewerControl<E extends Env>(
  c: Context<E>,
  options: DecksRouterOptions<E>,
  deck: CompiledDeck,
  slug: string,
  mountPath: string,
): Promise<{ item: Exclude<DeckViewerControlItem, null | false | undefined>; placement: "before" | "after" } | null> {
  const presenter = options.presenter;
  if (!presenter || !presenter.viewerControl) return null;
  if (!(await isPresenterEnabled(c, options, deck, slug, mountPath))) return null;

  const control = presenter.viewerControl === true ? {} : presenter.viewerControl;
  const presenterPath = createDeckPaths(mountPath, slug).presenter;
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

async function isPresenterEnabled<E extends Env>(
  c: Context<E>,
  options: DecksRouterOptions<E>,
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
      presenterPath: createDeckPaths(mountPath, slug).presenter,
      presentationPath: createDeckPaths(mountPath, slug).presentation,
    }),
  );
}

function renderDeckIndexContent(
  decks: Awaited<ReturnType<DeckSource["listDecks"]>>,
  mountPath: string,
): string {
  const basePath = mountPath.replace(/\/$/, "");
  const items = decks
    .map((deck) => {
      const href = `${basePath}/${encodeURIComponent(deck.slug)}`;
      const title = escapeHtml(deck.title ?? deck.slug);
      const description = deck.description ? `<p>${escapeHtml(deck.description)}</p>` : "";
      return `<li><a href="${href}">${title}</a>${description}</li>`;
    })
    .join("");

  return `<main>
    <h1>Hono Decks</h1>
    <ul>${items}</ul>
  </main>`;
}

function renderDeckIndex(
  content: string,
  title: string,
  document: ResolvedDeckDocument,
): string {
  return `<!doctype html>
<html lang="${escapeHtml(document.lang)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  ${document.head}
</head>
<body>
  ${content}
</body>
</html>`;
}

async function resolveIndexTitle<E extends Env>(
  title: DeckIndexPageOptions<E>["title"],
  input: DeckIndexPageInput<E>,
): Promise<string> {
  const resolved = typeof title === "function" ? await title(input) : title;
  return resolved?.trim() || "Hono Decks";
}

async function isPageSurfaceEnabled<E extends Env>(
  options: DecksRouterOptions<E>,
  input: DeckRouteSurfaceInput<E>,
): Promise<boolean> {
  const configured = input.surface === "index"
    ? options.pages?.index === false
      ? false
      : options.pages?.index?.enabled
    : options.pages?.[input.surface];
  if (typeof configured === "function") return Boolean(await configured(input));
  return configured !== false;
}

async function resolveRouterDocument<E extends Env>(
  c: Context<E>,
  options: DecksRouterOptions<E>,
  surface: Parameters<typeof resolveDeckDocument<E>>[0]["surface"],
  mountPath: string,
  deck?: CompiledDeck,
  titleOverride?: string,
): Promise<ResolvedDeckDocument> {
  const title = titleOverride ?? deck?.meta.title ?? deck?.slug ?? "Hono Decks";
  return resolveDeckDocument(
    {
      c,
      surface,
      deck,
      slug: deck?.slug,
      mountPath,
      title: surface === "presenter" ? `${title} - Presenter` : title,
    },
    options.document,
  );
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
