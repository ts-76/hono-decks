import { renderRemotePage } from "./remote/ui";
import { Hono } from "hono";
import type { Context, Env, MiddlewareHandler } from "hono";
import { raw } from "hono/html";
import { renderCompiledDeckPageAsync } from "../renderer/compiled-render";
import type { DeckRenderable, MaybePromise } from "../renderer/compiled-render";
import { renderJsxValue } from "../renderer/jsx-renderer";
import { renderDeckOverviewPageAsync } from "../renderer/overview-page";
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
  resolveTwitterPlayerOptions,
  X_PLAYER_FRAME_ANCESTORS,
  type DeckViewerAvailablePages,
  type DeckViewerControlItem,
  type DeckViewerControlSlotItems,
  type DeckViewerControlsOptions,
  type DeckPageMeta,
  type DeckTocItem,
  type DeckViewerOptions,
  type DeckViewerParts,
} from "./viewer";
import {
  extractAssetPath,
  inferMountPath,
  isWithinMount,
  normalizeClientEntryAssetPath,
  resolveGeneratedClientEntryUrl,
  stripPathSuffix,
} from "./path-utils";
import { createDeckPaths, normalizeMountPath } from "./paths";
import { resolveDeckDocument, type DeckDocumentOptions, type ResolvedDeckDocument } from "./document";
import { renderDeckExternalEmbedResponse, type DeckExternalEmbedOptions } from "./external-embed";

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
export { createDeckViewerEmbed, createDeckViewerParts, X_PLAYER_FRAME_ANCESTORS } from "./viewer";
export type {
  DeckViewerEmbed,
  DeckViewerEmbedOptions,
  DeckViewerAvailablePages,
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
  DeckViewerProgressStyle,
  DeckViewerParts,
  DeckViewerRenderControlItem,
  DeckViewerRenderInput,
  DeckViewerTwitterPlayerOptions,
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
  /**
   * Public mount path. When set, the router refuses requests outside it so a
   * mount that disagrees with compiled asset URLs fails loudly instead of
   * rendering broken links. Generated decks always set it.
   */
  mountPath?: string;
  /** Development live-reload event stream (Server-Sent Events) URL. */
  liveReloadPath?: string;
  style?: string;
  components?: SlideComponentRegistry | Record<string, SlideComponentInput>;
  client?: DecksClientOptions;
  document?: DeckDocumentOptions<E>;
  pages?: DecksRouterPagesOptions<E>;
  embed?: false | DeckExternalEmbedOptions<E>;
  viewer?: DeckViewerOptions<E>;
  presenter?: false | DecksRouterPresenterOptions<E>;
  export?: false | DeckExportOptions<E>;
  remote?: DeckRemoteOptions<E>;
}

/** Structural binding shape accepted from a Cloudflare Durable Object namespace. */
export interface DeckRemoteNamespace {
  idFromName(name: string): any;
  get(id: any): { fetch(request: Request): Promise<Response> };
}

/** Application-owned authorization and Durable Object binding for live rooms. */
export interface DeckRemoteOptions<E extends Env = any> {
  namespace(input: { c: Context<E> }): DeckRemoteNamespace | undefined;
  authorize(input: { c: Context<E>; slug: string; role: "presenter" | "follower" }): MaybePromise<boolean>;
  session?(input: { c: Context<E>; slug: string }): string;
  follow?: boolean;
}

/** Client island script delivery. */
export interface DecksClientOptions {
  /** Route, relative to the mount, that serves `bundle`. @default "/_assets/client" */
  path?: string;
  /** Use this script URL instead of the served bundle. */
  url?: string;
  /** Generated client bundle source. Set by the compiler. */
  bundle?: string;
}

export type DeckRouteSurface = "index" | "viewer" | "render" | "print" | "overview" | "presentation" | "presenter";

export interface DeckRouteSurfaceInput<E extends Env = any> {
  c: Context<E>;
  surface: DeckRouteSurface;
  mountPath: string;
  dev: boolean;
  deck?: CompiledDeck;
  slug?: string;
}

export type DeckRouteEnabledResolver<E extends Env = any> = (input: DeckRouteSurfaceInput<E>) => MaybePromise<boolean>;

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
  /** Grid of slide thumbnails at `/:slug/overview`. */
  overview?: DeckRouteEnabled<E>;
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
  /** Target duration in seconds, or a string such as 20m. */
  duration?: number | string;
}

export type DeckPresenterEnabledResolver<E extends Env = any> = (
  input: DeckPresenterEnabledInput<E>,
) => MaybePromise<boolean>;

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
  pages?: Pick<DecksRouterPagesOptions<E>, "print" | "overview">;
  viewer?: Pick<DeckViewerOptions<E>, "controls" | "openGraph">;
}

export function decksRouter<E extends Env = any>(options: DecksRouterOptions<E>): Hono<E> {
  const router = new Hono<E>();
  const twitterPlayer = resolveTwitterPlayerOptions(options.viewer?.openGraph);
  if (twitterPlayer && !options.embed) {
    throw new Error(
      "hono-decks: viewer.openGraph.twitterPlayer needs the embed option, because the X Player Card frames /:slug/embed. Add embed: {} to the router options.",
    );
  }
  const configuredMount = options.mountPath === undefined ? undefined : normalizeMountPath(options.mountPath);

  if (configuredMount !== undefined) {
    router.use("*", async (c, next) => {
      if (!isWithinMount(c.req.path, configuredMount)) {
        throw new Error(
          `hono-decks: this router was compiled for mountPath "${configuredMount}" but received "${c.req.path}". ` +
            `Mount it with app.route(decks.mountPath, decks.router()), or change mountPath in hono-decks.config.ts and recompile.`,
        );
      }
      await next();
    });
  }
  const resolveMountPath = (path: string, suffix: string): string =>
    configuredMount === undefined ? stripPathSuffix(path, suffix) : configuredMount === "/" ? "" : configuredMount;

  if (options.client?.bundle) {
    router.get(normalizeClientEntryAssetPath(options.client.path), serveDecksClientEntry(options.client.bundle));
  }

  for (const extension of options.extensions ?? []) {
    router.route(extension.path, extension.router);
  }

  router.get("/", async (c) => {
    const dev = await isDevEnabled(c, options);
    const decks = (await options.source.listDecks(c)).filter((deck) => dev || !deck.draft);
    const mountPath = configuredMount === undefined ? c.req.path.replace(/\/$/, "") : resolveMountPath(c.req.path, "");
    const pageInput: DeckIndexPageInput<E> = { c, surface: "index", mountPath, dev, decks };
    if (!(await isPageSurfaceEnabled(options, pageInput))) {
      return c.notFound();
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
      return c.notFound();
    }
    const response = await options.source.getAsset?.(c, slug, assetPath);
    if (!response) return c.notFound();
    const headers = new Headers(response.headers);
    if (await isDevEnabled(c, options)) {
      headers.set("cache-control", "no-store");
      headers.delete("etag");
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    }
    const etag = headers.get("etag");
    const candidates = c.req
      .header("if-none-match")
      ?.split(",")
      .map((tag) => tag.trim().replace(/^W\//, ""));
    if (
      response.status === 200 &&
      etag &&
      !headers.get("cache-control")?.includes("no-store") &&
      candidates?.some((tag) => tag === "*" || tag === etag.replace(/^W\//, ""))
    ) {
      await response.body?.cancel();
      return new Response(null, { status: 304, headers });
    }
    return response;
  });

  router.get("/:slug/render", async (c) => {
    const slug = c.req.param("slug");
    const deck = await options.source.getCompiledDeck(c, slug);
    const dev = await isDevEnabled(c, options);
    if (!deck || (!dev && deck.meta.draft)) return c.notFound();
    const mountPath = resolveMountPath(c.req.path, `/${slug}/render`);
    if (!(await isPageSurfaceEnabled(options, { c, surface: "render", mountPath, dev, deck, slug }))) {
      return c.notFound();
    }
    const clientEntry =
      options.client?.url ??
      (deck.clientEntryRequired === false ? undefined : resolveGeneratedClientEntryUrl(options.client, mountPath));
    try {
      const document = await resolveRouterDocument(c, options, "render", mountPath, deck);
      return c.html(
        await renderCompiledDeckPageAsync({
          deck,
          mountPath,
          style: options.style,
          components: options.components,
          clientEntry,
          dev,
          liveReloadPath: dev ? options.liveReloadPath : undefined,
          speakerNotes: options.remote ? false : undefined,
          document,
        }),
      );
    } catch (error) {
      const message =
        error instanceof RenderError
          ? error.message
          : `Render failed in ${deck.sourcePath}: ${formatErrorMessage(error)}`;
      return c.text(message, 500);
    }
  });

  router.get("/:slug/print", async (c) => {
    const slug = c.req.param("slug");
    const deck = await options.source.getCompiledDeck(c, slug);
    const dev = await isDevEnabled(c, options);
    if (!deck || (!dev && deck.meta.draft)) return c.notFound();
    const mountPath = resolveMountPath(c.req.path, `/${slug}/print`);
    if (!(await isPageSurfaceEnabled(options, { c, surface: "print", mountPath, dev, deck, slug }))) {
      return c.notFound();
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
        error instanceof RenderError
          ? error.message
          : `Render failed in ${deck.sourcePath}: ${formatErrorMessage(error)}`;
      return c.text(message, 500);
    }
  });

  router.get("/:slug/overview", async (c) => {
    const slug = c.req.param("slug");
    const deck = await options.source.getCompiledDeck(c, slug);
    const dev = await isDevEnabled(c, options);
    if (!deck || (!dev && deck.meta.draft)) return c.notFound();
    const mountPath = resolveMountPath(c.req.path, `/${slug}/overview`);
    if (!(await isPageSurfaceEnabled(options, { c, surface: "overview", mountPath, dev, deck, slug }))) {
      return c.notFound();
    }
    try {
      const document = await resolveRouterDocument(c, options, "overview", mountPath, deck);
      return c.html(
        await renderDeckOverviewPageAsync({
          deck,
          viewerPath: createDeckPaths(mountPath, slug).viewer,
          currentSlide: positiveIntegerParam(c.req.query("slide") ?? null),
          style: options.style,
          components: options.components,
          document,
        }),
      );
    } catch (error) {
      const message =
        error instanceof RenderError
          ? error.message
          : `Render failed in ${deck.sourcePath}: ${formatErrorMessage(error)}`;
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
      const dev = await isDevEnabled(c, options);
      if (!deck || (!dev && deck.meta.draft)) {
        return c.notFound();
      }
      const mountPath = resolveMountPath(c.req.path, `/${slug}/embed`);
      const availablePages = await resolveViewerAvailablePages(c, options, deck, slug, mountPath, dev);
      return renderDeckExternalEmbedResponse({
        context: { c, deck, slug, mountPath },
        options: embedOptions,
        document: options.document,
        availablePages,
        additionalFrameAncestors: twitterPlayer ? X_PLAYER_FRAME_ANCESTORS : undefined,
      });
    });
  }

  router.get("/:slug/remote", async (c) => {
    const remote = options.remote;
    if (!remote || !remote.namespace({ c })) return c.notFound();
    const slug = c.req.param("slug");
    const deck = await options.source.getCompiledDeck(c, slug);
    const dev = await isDevEnabled(c, options);
    if (!deck || (!dev && deck.meta.draft)) return c.notFound();
    if (!(await remote.authorize({ c, slug, role: "presenter" }))) return c.text("Forbidden", 403);
    const mountPath = resolveMountPath(c.req.path, `/${slug}/remote`);
    const document = await resolveRouterDocument(c, options, "presenter", mountPath, deck);
    c.header("Cache-Control", "private, no-store");
    return c.html(renderRemotePage(deck, document));
  });

  router.get("/:slug/remote/socket", async (c) => {
    const remote = options.remote;
    const namespace = remote?.namespace({ c });
    if (!remote || !namespace) return c.notFound();
    const slug = c.req.param("slug");
    const deck = await options.source.getCompiledDeck(c, slug);
    if (!deck || (!(await isDevEnabled(c, options)) && deck.meta.draft)) return c.notFound();
    if (c.req.header("upgrade")?.toLowerCase() !== "websocket") return c.text("Upgrade required", 426);
    const role = c.req.query("role");
    if (role !== "presenter" && role !== "follower") return c.text("Forbidden", 403);
    const origin = c.req.header("origin");
    if ((origin && origin !== new URL(c.req.url).origin) || !(await remote.authorize({ c, slug, role }))) {
      return c.text("Forbidden", 403);
    }
    const headers = new Headers(c.req.raw.headers);
    headers.set("X-Hono-Decks-Role", role);
    headers.set("X-Hono-Decks-Slide-Count", String(deck.slides.length));
    const request = new Request(c.req.raw, { headers });
    return namespace.get(namespace.idFromName(remote.session?.({ c, slug }) ?? slug)).fetch(request);
  });

  router.get("/:slug/presentation", async (c) => {
    const slug = c.req.param("slug");
    const deck = await options.source.getCompiledDeck(c, slug);
    const dev = await isDevEnabled(c, options);
    if (!deck || (!dev && deck.meta.draft)) return c.notFound();
    const mountPath = resolveMountPath(c.req.path, `/${slug}/presentation`);
    if (!(await isPageSurfaceEnabled(options, { c, surface: "presentation", mountPath, dev, deck, slug }))) {
      return c.notFound();
    }
    const clientEntry =
      options.client?.url ??
      (deck.clientEntryRequired === false ? undefined : resolveGeneratedClientEntryUrl(options.client, mountPath));
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
          dev,
          liveReloadPath: dev ? options.liveReloadPath : undefined,
          document,
        }),
      );
    } catch (error) {
      const message =
        error instanceof RenderError
          ? error.message
          : `Render failed in ${deck.sourcePath}: ${formatErrorMessage(error)}`;
      return c.text(message, 500);
    }
  });

  router.get("/:slug/presenter", async (c) => {
    const slug = c.req.param("slug");
    const deck = await options.source.getCompiledDeck(c, slug);
    const dev = await isDevEnabled(c, options);
    if (!deck || (!dev && deck.meta.draft)) return c.notFound();
    const mountPath = resolveMountPath(c.req.path, `/${slug}/presenter`);
    if (!(await isPageSurfaceEnabled(options, { c, surface: "presenter", mountPath, dev, deck, slug }))) {
      return c.notFound();
    }
    if (!(await isPresenterEnabled(c, options, deck, slug, mountPath))) {
      return c.notFound();
    }
    try {
      const document = await resolveRouterDocument(c, options, "presenter", mountPath, deck);
      c.header("Cache-Control", "private, no-store");
      return c.html(
        await renderPresenterPageAsync({
          deck,
          mountPath,
          presenterStateQuery: paginationQueryFromRequest(c),
          duration: options.presenter === false ? undefined : options.presenter?.duration,
          remote: Boolean(
            options.remote?.namespace({ c }) && (await options.remote.authorize({ c, slug, role: "presenter" })),
          ),
          style: options.style,
          components: options.components,
          document,
        }),
      );
    } catch (error) {
      const message =
        error instanceof RenderError
          ? error.message
          : `Render failed in ${deck.sourcePath}: ${formatErrorMessage(error)}`;
      return c.text(message, 500);
    }
  });

  router.get("/:slug", async (c) => {
    const slug = c.req.param("slug");
    const deck = await options.source.getCompiledDeck(c, slug);
    const dev = await isDevEnabled(c, options);
    if (!deck || (!dev && deck.meta.draft)) return c.notFound();
    const mountPath = resolveMountPath(c.req.path, `/${slug}`);
    if (!(await isPageSurfaceEnabled(options, { c, surface: "viewer", mountPath, dev, deck, slug }))) {
      return c.notFound();
    }
    const availablePages = await resolveViewerAvailablePages(c, options, deck, slug, mountPath, dev);
    return c.html(
      await renderDeckViewerPage({
        c,
        deck,
        mountPath,
        viewerStateQuery: paginationQueryFromRequest(c),
        remote:
          options.remote?.namespace({ c }) && (await options.remote.authorize({ c, slug, role: "follower" }))
            ? { follow: options.remote.follow !== false }
            : undefined,
        viewer: {
          ...options.viewer,
          controls: await resolveViewerControls(c, options, deck, slug, mountPath),
        },
        availablePages,
        exportOptions: options.export,
        document: options.document,
        twitterPlayer: Boolean(options.embed),
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
    if (!slug) return c.notFound();
    const sourceContext = c as unknown as Context<E>;
    const deck = await options.source.getCompiledDeck(sourceContext, slug);
    const dev = await isDevEnabled(sourceContext, options);
    if (!deck || (!dev && deck.meta.draft)) return c.notFound();
    const mountPath = options.mountPath ?? inferMountPath(c.req.path, slug);
    const availablePages = await resolveViewerAvailablePages(sourceContext, options, deck, slug, mountPath, dev);
    const viewer = await createDeckViewerParts({
      deck,
      mountPath,
      controls: options.viewer?.controls,
      openGraph: options.viewer?.openGraph,
      availablePages,
    });

    c.set("deck", deck);
    c.set("deckViewer", viewer);
    c.set("deckToc", viewer.slides);
    c.set("deckMeta", viewer.meta);
    await next();
  };
}

async function resolveViewerAvailablePages<E extends Env>(
  c: Context<E>,
  options: Pick<DecksRouterOptions<E>, "pages">,
  deck: CompiledDeck,
  slug: string,
  mountPath: string,
  dev: boolean,
): Promise<DeckViewerAvailablePages> {
  return {
    print: await isPageSurfaceEnabled(options, { c, surface: "print", mountPath, dev, deck, slug }),
    overview: await isPageSurfaceEnabled(options, { c, surface: "overview", mountPath, dev, deck, slug }),
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

function renderDeckIndexContent(decks: Awaited<ReturnType<DeckSource["listDecks"]>>, mountPath: string): string {
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

function renderDeckIndex(content: string, title: string, document: ResolvedDeckDocument): string {
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
  options: Pick<DecksRouterOptions<E>, "pages">,
  input: DeckRouteSurfaceInput<E>,
): Promise<boolean> {
  const configured =
    input.surface === "index"
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
