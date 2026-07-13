import type { Context, Env } from "hono";
import type { CompiledDeck, DeckSource } from "../deck/model";
import type { MaybePromise } from "../renderer/compiled-render";
import { stripPathSuffix } from "./path-utils";

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

export interface DeckExportOptions<E extends Env = any> {
  browser(c: Context<E>): MaybePromise<DeckBrowserRunBinding | null | undefined>;
  authorize?(c: Context<E>, input: DeckExportAuthorizeInput): MaybePromise<boolean>;
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
  export?: DeckExportOptions<E>;
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
  if (!(await isBrowserExportAuthorized(c, exportOptions, deck, format))) {
    return c.json({ error: "Browser export not authorized", slug, format }, 403);
  }
  const browser = await exportOptions.browser(c);
  if (!browser) return c.json({ error: "Browser export not configured", slug, format }, 503);

  const mountPath = stripPathSuffix(c.req.path, `/${slug}/export.${format}`);
  const printUrl = new URL(`${mountPath}/${encodeURIComponent(slug)}/print`, c.req.url).toString();
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

export function isPdfExportEnabled<E extends Env = any>(options: DeckExportOptions<E> | undefined): boolean {
  return options?.pdf !== undefined && options.pdf !== false;
}

export function isPngExportEnabled<E extends Env = any>(options: DeckExportOptions<E> | undefined): boolean {
  return options?.png !== undefined && options.png !== false;
}

export async function resolveAuthorizedExportPaths<E extends Env = any>(
  c: Context<E>,
  deck: CompiledDeck,
  options: DeckExportOptions<E> | undefined,
): Promise<DeckViewerExportPaths> {
  if (!options) return {};
  const pdf = isPdfExportEnabled(options) && (await isBrowserExportAuthorized(c, options, deck, "pdf"));
  const png = isPngExportEnabled(options) && (await isBrowserExportAuthorized(c, options, deck, "png"));
  return { pdf, png };
}

async function isBrowserExportAuthorized<E extends Env = any>(
  c: Context<E>,
  options: DeckExportOptions<E>,
  deck: CompiledDeck,
  format: "pdf" | "png",
): Promise<boolean> {
  return options.authorize ? options.authorize(c, { deck, format }) : true;
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
  const normalized = value
    .trim()
    .replaceAll(/[^a-zA-Z0-9._-]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
  return normalized || "deck";
}
