import type { Context, Env } from "hono";
import type { CompiledDeck } from "../deck/model";
import type { DeckRenderable, MaybePromise } from "../renderer/compiled-render";
import { renderJsxValue } from "../renderer/jsx-renderer";
import {
  documentNonceAttribute,
  resolveDeckDocument,
  type DeckDocumentOptions,
  type DeckDocumentPageOptions,
  type ResolvedDeckDocument,
} from "./document";
import {
  createDeckViewerEmbed,
  type DeckViewerAvailablePages,
  type DeckViewerControlsOptions,
  type DeckViewerControlsContext,
  type DeckViewerEmbed,
  type DeckViewerEmbedOptions,
} from "./viewer";

export interface DeckExternalEmbedContext<E extends Env = any> {
  c: Context<E>;
  deck: CompiledDeck;
  slug: string;
  mountPath: string;
}

export type DeckExternalEmbedViewerOptions = Omit<DeckViewerEmbedOptions, "deck" | "mountPath" | "nonce">;

export interface DeckExternalEmbedRenderInput<E extends Env = any> extends DeckExternalEmbedContext<E> {
  viewer: DeckViewerEmbed;
  document: ResolvedDeckDocument;
}

export interface DeckExternalEmbedOptions<E extends Env = any> {
  enabled?: boolean | ((input: DeckExternalEmbedContext<E>) => MaybePromise<boolean>);
  frameAncestors?:
    | string
    | string[]
    | ((input: DeckExternalEmbedContext<E>) => MaybePromise<string | string[] | undefined>);
  document?: DeckDocumentPageOptions<E>;
  viewer?:
    | DeckExternalEmbedViewerOptions
    | ((input: DeckExternalEmbedContext<E>) => MaybePromise<DeckExternalEmbedViewerOptions>);
  pageStyle?: string;
  robots?: string | false;
  render?(input: DeckExternalEmbedRenderInput<E>): MaybePromise<DeckRenderable>;
}

export async function renderDeckExternalEmbedResponse<E extends Env>(input: {
  context: DeckExternalEmbedContext<E>;
  options: DeckExternalEmbedOptions<E>;
  document?: DeckDocumentOptions<E>;
  availablePages?: Partial<DeckViewerAvailablePages>;
}): Promise<Response> {
  const { c, deck, slug, mountPath } = input.context;
  const enabled = input.options.enabled;
  if (enabled === false || (typeof enabled === "function" && !(await enabled(input.context)))) {
    return c.json({ error: "Embed route not found", slug }, 404);
  }

  const document = await resolveDeckDocument(
    {
      c,
      surface: "embed",
      deck,
      slug,
      mountPath,
      title: deck.meta.title ?? slug,
    },
    input.document,
    input.options.document,
  );
  const viewerOptions =
    typeof input.options.viewer === "function" ? await input.options.viewer(input.context) : input.options.viewer;
  const controls: false | DeckViewerControlsOptions =
    viewerOptions?.controls === undefined
      ? {
          items: (_defaults: unknown, context: DeckViewerControlsContext) => [
            {
              type: "link" as const,
              key: "open-viewer",
              href: context.meta.paths.viewer,
              label: "Open full viewer in new tab",
              icon: "external-link" as const,
              attributes: {
                "aria-label": "Open full viewer in new tab",
                "data-hono-decks-viewer-link": true,
                target: "_blank",
                rel: "noreferrer",
              },
            },
          ],
        }
      : viewerOptions.controls;
  const viewer = await createDeckViewerEmbed({
    deck,
    mountPath,
    ...viewerOptions,
    controls,
    availablePages: input.availablePages,
    nonce: document.nonce,
  });
  const renderInput = { ...input.context, viewer, document };
  const body = input.options.render ? await input.options.render(renderInput) : viewer.embed;
  const html = await renderExternalEmbedDocument({
    title: deck.meta.title ?? slug,
    body: await renderJsxValue(body),
    document,
    pageStyle: input.options.pageStyle,
    robots: input.options.robots,
  });
  const frameAncestorsValue =
    typeof input.options.frameAncestors === "function"
      ? await input.options.frameAncestors(input.context)
      : input.options.frameAncestors;
  const response = c.html(html);
  const headers = new Headers(response.headers);
  headers.delete("x-frame-options");
  headers.set(
    "content-security-policy",
    withFrameAncestors(headers.get("content-security-policy"), normalizeFrameAncestors(frameAncestorsValue)),
  );
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function renderExternalEmbedDocument(input: {
  title: string;
  body: string;
  document: ResolvedDeckDocument;
  pageStyle?: string;
  robots?: string | false;
}): Promise<string> {
  const nonceAttribute = documentNonceAttribute(input.document.nonce);
  const robots =
    input.robots === false ? "" : `<meta name="robots" content="${escapeHtml(input.robots ?? "noindex")}"/>`;
  return `<!doctype html>
<html lang="${escapeHtml(input.document.lang)}" data-hono-decks-external-embed-document>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  ${robots}
  <title>${escapeHtml(input.title)}</title>
  <style id="hono-decks-external-embed-css"${nonceAttribute}>${externalEmbedPageStyle()}${input.pageStyle ?? ""}</style>
  ${input.document.head}
</head>
<body>${input.body}</body>
</html>`;
}

function normalizeFrameAncestors(value: string | string[] | undefined): string[] {
  const values = Array.isArray(value) ? value : (value?.split(/[\s,]+/) ?? []);
  const ancestors = new Set<string>(["'self'"]);

  for (const candidate of values) {
    const token = candidate.trim();
    if (!token || token === "'self'") continue;
    if (token === "*") return ["*"];
    if (token === "'none'") return ["'none'"];

    try {
      const url = new URL(token);
      if ((url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password) {
        ancestors.add(url.origin);
      }
    } catch {
      // Invalid values never widen the same-origin default.
    }
  }

  return [...ancestors];
}

function withFrameAncestors(currentPolicy: string | null, ancestors: string[]): string {
  const directives = (currentPolicy ?? "")
    .split(";")
    .map((directive) => directive.trim())
    .filter((directive) => directive && !/^frame-ancestors(?:\s|$)/i.test(directive));
  directives.push(`frame-ancestors ${ancestors.join(" ")}`);
  return directives.join("; ");
}

function externalEmbedPageStyle(): string {
  return `:root{color-scheme:dark;background:#050816}html,body{width:100%;height:100%;margin:0;overflow:hidden}body{min-height:100vh}@supports (height:100dvh){body{min-height:100dvh}}.hono-decks-embedded-viewer{width:100%;height:100%;min-height:0;overflow:hidden}.hono-decks-embedded-viewer .hono-decks-viewer-shell{position:relative;height:100%;grid-template-rows:minmax(0,1fr);overflow:hidden}.hono-decks-embedded-viewer .hono-decks-viewport{width:min(100%,calc(100vh * 16 / 9));max-height:100%}@supports (height:100dvh){.hono-decks-embedded-viewer .hono-decks-viewport{width:min(100%,calc(100dvh * 16 / 9))}}.hono-decks-embedded-viewer .hono-decks-viewer-controls{bottom:max(.25rem,env(safe-area-inset-bottom,0px));z-index:4}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
