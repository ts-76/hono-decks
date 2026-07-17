import type { Context, Env } from "hono";
import type { CompiledDeck, DeckSource } from "../deck/model";
import type { MaybePromise } from "../renderer/compiled-render";
import { stripPathSuffix } from "./path-utils";
import { createDeckPaths, type DeckPaths } from "./paths";

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

/** Request data passed to Browser Rendering binding and authorization resolvers. */
export interface DeckExportResolverInput<E extends Env = any> {
  c: Context<E>;
  deck: CompiledDeck;
  slug: string;
  mountPath: string;
  paths: DeckPaths;
  format: "pdf" | "png";
}

export interface DeckExportOptions<E extends Env = any> {
  browser(input: DeckExportResolverInput<E>): MaybePromise<DeckBrowserRunBinding | null | undefined>;
  authorize?(input: DeckExportResolverInput<E>): MaybePromise<boolean>;
  pdf?: boolean | DeckBrowserRunPdfOptions;
  png?: boolean | DeckBrowserRunPngOptions;
}

export interface DeckViewerExportPaths {
  pdf?: boolean;
  png?: boolean;
}

export interface BrowserExportRouterOptions<E extends Env = any> {
  source: DeckSource<E>;
  dev?: boolean;
  export?: false | DeckExportOptions<E>;
}

export async function renderDeckBrowserExport<E extends Env = any>(
  c: Context<E>,
  options: BrowserExportRouterOptions<E>,
  format: "pdf" | "png",
): Promise<Response> {
  const slug = c.req.param("slug");
  if (!slug) return c.json({ error: "Deck not found", slug: "" }, 404);
  const deck = await options.source.getCompiledDeck(c, slug);
  if (!deck || (options.dev !== true && deck.meta.draft)) return c.json({ error: "Deck not found", slug }, 404);

  const exportOptions = options.export;
  if (!exportOptions) return c.json({ error: "Browser export not configured", slug, format }, 503);
  const mountPath = stripPathSuffix(c.req.path, `/${slug}/export.${format}`);
  const resolverInput: DeckExportResolverInput<E> = {
    c,
    deck,
    slug,
    mountPath,
    paths: createDeckPaths(mountPath, slug),
    format,
  };
  if (!(await isBrowserExportAuthorized(exportOptions, resolverInput))) {
    return c.json({ error: "Browser export not authorized", slug, format }, 403);
  }
  const browser = await exportOptions.browser(resolverInput);
  if (!browser) return c.json({ error: "Browser export not configured", slug, format }, 503);

  const printUrl = new URL(resolverInput.paths.print, c.req.url).toString();
  const action = format === "pdf" ? "pdf" : "screenshot";
  const response = await browser.quickAction(action, createBrowserRunExportRequest(exportOptions, printUrl, format));
  const headers = new Headers(response.headers);
  if (!headers.has("content-type")) headers.set("content-type", format === "pdf" ? "application/pdf" : "image/png");
  headers.set("content-disposition", `attachment; filename="${exportFilename(exportOptions, deck, format)}"`);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function isPdfExportEnabled<E extends Env = any>(options: false | DeckExportOptions<E> | undefined): boolean {
  return Boolean(options && options.pdf !== undefined && options.pdf !== false);
}

export function isPngExportEnabled<E extends Env = any>(options: false | DeckExportOptions<E> | undefined): boolean {
  return Boolean(options && options.png !== undefined && options.png !== false);
}

export async function resolveAuthorizedExportPaths<E extends Env = any>(
  c: Context<E>,
  deck: CompiledDeck,
  mountPath: string,
  options: false | DeckExportOptions<E> | undefined,
): Promise<DeckViewerExportPaths> {
  if (!options) return {};
  const slug = deck.slug;
  const paths = createDeckPaths(mountPath, slug);
  const pdf = isPdfExportEnabled(options) && (await isBrowserExportAuthorized(options, { c, deck, slug, mountPath, paths, format: "pdf" }));
  const png = isPngExportEnabled(options) && (await isBrowserExportAuthorized(options, { c, deck, slug, mountPath, paths, format: "png" }));
  return { pdf, png };
}

async function isBrowserExportAuthorized<E extends Env = any>(
  options: DeckExportOptions<E>,
  input: DeckExportResolverInput<E>,
): Promise<boolean> {
  return options.authorize ? options.authorize(input) : true;
}

function createBrowserRunExportRequest(
  options: Pick<DeckExportOptions, "pdf" | "png">,
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

function exportFilename(
  options: Pick<DeckExportOptions, "pdf" | "png">,
  deck: CompiledDeck,
  format: "pdf" | "png",
): string {
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

function safeFilename(value: string): string {
  const sanitized = value.trim().replaceAll(/[^a-zA-Z0-9._-]+/g, "-");
  let start = 0;
  let end = sanitized.length;
  while (sanitized[start] === "-") start += 1;
  while (end > start && sanitized[end - 1] === "-") end -= 1;
  const normalized = sanitized.slice(start, end);
  return normalized || "deck";
}
