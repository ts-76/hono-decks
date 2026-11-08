import { enMessages } from "../shared/messages";
import { viewerMessages, remoteMessages } from "../shared/messages";
import {
  resolveMessages,
  formatMessage,
  formatSlideCount,
  type DeckMessages,
  type DeckMessageOverrides,
} from "../shared/messages";
import type { Context, Env } from "hono";
import { raw } from "hono/html";
import { jsx } from "hono/jsx/jsx-runtime";
import type { CompiledDeck } from "../deck/model";
import type { DeckRenderable, MaybePromise } from "../renderer/compiled-render";
import { renderControlIcon, renderControlIconHtml, type DeckControlIconName } from "../renderer/control-icons";
import { renderJsxValue } from "../renderer/jsx-renderer";
import type { DeckExportOptions, DeckViewerExportPaths } from "./browser-export";
import { resolveAuthorizedExportPaths } from "./browser-export";
import { remoteIndicator, remoteStyle, renderRemoteScript } from "./remote/ui";
import { renderViewerScript } from "./viewer-script";
import { baseViewerStyle, embeddedViewerStyle } from "./viewer-style";
import { composeStylesheet } from "../renderer/style-layers";
import { createDeckPaths, type DeckPaths } from "./paths";
import { documentNonceAttribute, resolveDeckDocument, type DeckDocumentOptions } from "./document";

export const VIEWER_MESSAGES = viewerMessages(enMessages);

export interface DeckViewerOptions<E extends Env = any> {
  controls?: false | DeckViewerControlsOptions;
  openGraph?: boolean | DeckViewerOpenGraphOptions;
  style?: string;
  head?: MaybePromise<DeckRenderable> | ((input: DeckViewerRenderInput<E>) => MaybePromise<DeckRenderable>);
  lang?: string | ((input: DeckViewerRenderInput<E>) => MaybePromise<string>);
  nonce?: string | ((input: DeckViewerRenderInput<E>) => MaybePromise<string | undefined>);
  render?(input: DeckViewerRenderInput<E>): MaybePromise<DeckRenderable>;
}

export interface DeckViewerOpenGraphOptions {
  /** Public image URL. Defaults to `paths.ogImage` when Open Graph metadata is enabled. */
  imagePath?: string | ((input: DeckViewerOpenGraphInput) => MaybePromise<string | undefined>);
  /**
   * Emit an X (Twitter) Player Card that plays the deck's `embed` route inside
   * posts. Requires the router `embed` option and HTTPS. X documents no current
   * contract: on the web it plays inline, its mobile apps open the embed URL in a
   * web view, and the player does not run in X Articles.
   */
  twitterPlayer?: boolean | DeckViewerTwitterPlayerOptions;
}

export interface DeckViewerTwitterPlayerOptions {
  /** Player width in pixels. X uses width and height for the aspect ratio. @default 1280 */
  width?: number;
  /** Player height in pixels. @default 720 */
  height?: number;
}

/**
 * Origins allowed to frame a Player Card. X wraps the player in its own frame on
 * a subdomain, and CSP checks every ancestor, so the subdomain wildcards matter.
 */
export const X_PLAYER_FRAME_ANCESTORS = [
  "https://x.com",
  "https://*.x.com",
  "https://twitter.com",
  "https://*.twitter.com",
] as const;

export function resolveTwitterPlayerOptions(
  openGraph: boolean | DeckViewerOpenGraphOptions | undefined,
): Required<DeckViewerTwitterPlayerOptions> | undefined {
  if (!openGraph || openGraph === true || !openGraph.twitterPlayer) return undefined;
  const options = openGraph.twitterPlayer === true ? {} : openGraph.twitterPlayer;
  return { width: positiveSize(options.width, 1280), height: positiveSize(options.height, 720) };
}

function positiveSize(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value) : fallback;
}

export interface DeckViewerOpenGraphInput {
  deck: CompiledDeck;
  paths: DeckPaths;
}

export type DeckViewerControlKey =
  | "back"
  | "previous"
  | "position"
  | "next"
  | "fullscreen"
  | "toc"
  | "overview"
  | "print"
  | "exportPdf"
  | "exportPng";

export type DeckViewerProgressStyle = "bar" | "count" | "both";

export interface DeckViewerControlsOptions {
  className?: string;
  itemClassName?: string;
  attributes?: Record<string, string | boolean | undefined>;
  ariaLabel?: string;
  hidden?: DeckViewerControlKey[];
  labels?: Partial<Record<DeckViewerControlKey, string>>;
  before?: DeckViewerControlSlotItems;
  after?: DeckViewerControlSlotItems;
  items?: DeckViewerControlItem[] | DeckViewerControlsItemsResolver;
  renderItem?: DeckViewerControlItemRenderer;
  /**
   * How the `position` item shows slide progress: a bar along the slide's bottom
   * edge, the "n / total" count, or both. @default "bar"
   */
  progress?: DeckViewerProgressStyle;
  /** Hide idle viewer controls while the pointer is over the stage (default: true). */
  autoHide?: boolean;
}

export type DeckViewerControlsItemsResolver = (
  defaults: DeckViewerControlDefaults,
  context: DeckViewerControlsContext,
) => DeckViewerControlItem[];

export type DeckViewerControlSlotItems =
  | DeckViewerControlItem[]
  | ((context: DeckViewerControlsContext) => DeckViewerControlItem[]);

export interface DeckViewerControlRenderInput {
  context: DeckViewerControlsContext;
}

export type DeckViewerControlItemRenderer = (
  item: Exclude<DeckViewerControlItem, null | false | undefined>,
  context: DeckViewerControlsContext,
  renderDefault: () => DeckRenderable,
) => DeckRenderable;

export interface DeckViewerControlDefaults {
  back: DeckViewerDefaultControlItem;
  previous: DeckViewerDefaultControlItem;
  position: DeckViewerDefaultControlItem;
  next: DeckViewerDefaultControlItem;
  fullscreen: DeckViewerDefaultControlItem;
  toc: DeckViewerDefaultControlItem;
  overview: DeckViewerDefaultControlItem | null;
  print: DeckViewerDefaultControlItem | null;
  exportPdf: DeckViewerDefaultControlItem | null;
  exportPng: DeckViewerDefaultControlItem | null;
}

export interface DeckViewerAvailablePages {
  print: boolean;
  overview: boolean;
}

export interface DeckViewerControlsContext {
  slug: string;
  title: string;
  mountPath: string;
  meta: DeckPageMeta;
  slides: DeckTocItem[];
  messages: DeckMessages;
}

export type DeckViewerControlItem =
  | DeckViewerDefaultControlItem
  | DeckViewerLinkControlItem
  | DeckViewerRenderControlItem
  | null
  | false
  | undefined;

export interface DeckViewerDefaultControlItem {
  type: "default";
  key: DeckViewerControlKey;
  label?: string;
  className?: string;
  attributes?: Record<string, string | boolean | undefined>;
}

export interface DeckViewerLinkControlItem {
  type: "link";
  key?: string;
  href: string;
  label: string;
  icon?: DeckControlIconName;
  download?: string;
  className?: string;
  attributes?: Record<string, string | boolean | undefined>;
}

export interface DeckViewerRenderControlItem {
  type: "render";
  key?: string;
  render(input: DeckViewerControlRenderInput): DeckRenderable;
}

export interface DeckTocItem {
  index: number;
  title?: string;
  label: string;
}

/** Metadata and complete public route map for a viewer page. */
export interface DeckPageMeta {
  title: string;
  description?: string;
  paths: DeckPaths;
  availablePages: DeckViewerAvailablePages;
  availableExports: DeckViewerExportPaths;
  imagePath?: string;
}

export interface DeckViewerParts {
  slug: string;
  title: string;
  renderUrl: string;
  frame: DeckViewerPart;
  controls: DeckViewerPart | null;
  toc: DeckViewerPart;
  slides: DeckTocItem[];
  meta: DeckPageMeta;
}

/** One viewer part in both composable JSX form and pre-rendered HTML form. */
export interface DeckViewerPart {
  content: DeckRenderable;
  html: string;
}

export interface DeckViewerRenderInput<E extends Env = any> extends DeckViewerParts {
  c: Context<E>;
  deck: CompiledDeck;
  mountPath: string;
}

export interface DeckViewerEmbedOptions {
  deck: CompiledDeck;
  mountPath: string;
  viewerStateQuery?: string;
  controls?: false | DeckViewerControlsOptions;
  availablePages?: Partial<DeckViewerAvailablePages>;
  exportPaths?: DeckViewerExportPaths;
  style?: string;
  toc?: boolean;
  className?: string;
  nonce?: string;
  messages?: DeckMessages;
}

export interface DeckViewerEmbed extends DeckViewerParts {
  embed: DeckRenderable;
  embedHtml: string;
}

export async function createDeckViewerParts(input: {
  deck: CompiledDeck;
  mountPath: string;
  viewerStateQuery?: string;
  controls?: false | DeckViewerControlsOptions;
  openGraph?: boolean | DeckViewerOpenGraphOptions;
  availablePages?: Partial<DeckViewerAvailablePages>;
  exportPaths?: DeckViewerExportPaths;
  messages?: DeckMessages;
}): Promise<DeckViewerParts> {
  const slug = input.deck.slug;
  const title = input.deck.meta.title ?? slug;
  const basePath = input.mountPath.replace(/\/$/, "");
  const paths = createDeckPaths(basePath, slug);
  const imagePath = await resolveOpenGraphImagePath(input.openGraph, { deck: input.deck, paths });
  const renderUrl = `${paths.render}${input.viewerStateQuery ?? ""}`;
  const messages = input.messages ?? resolveMessages("en");
  const frameMessages = input.controls === false ? messages : { ...messages, ...input.controls?.labels };
  const slides = createDeckToc(input.deck, messages);
  const meta: DeckPageMeta = {
    title,
    description: input.deck.meta.description,
    paths,
    availablePages: {
      print: input.availablePages?.print !== false,
      overview: input.availablePages?.overview !== false,
    },
    availableExports: input.exportPaths ?? {},
    ...(imagePath ? { imagePath } : {}),
  };
  const controlsInput = input.controls === false ? false : (input.controls ?? {});
  const controlsContext: DeckViewerControlsContext = { slug, title, mountPath: basePath, meta, slides, messages };

  const controls = controlsInput === false ? null : renderViewerControls(controlsInput, controlsContext);

  return {
    slug,
    title,
    renderUrl,
    frame: {
      content: renderViewerFrame({ title, renderUrl, messages: frameMessages }),
      html: renderViewerFrameHtml({ title, renderUrl, messages: frameMessages }),
    },
    controls: controls ? { content: controls, html: await renderJsxValue(controls) } : null,
    toc: { content: renderViewerToc(slides, messages), html: renderViewerTocHtml(slides, messages) },
    slides,
    meta,
  };
}

export async function createDeckViewerEmbed(input: DeckViewerEmbedOptions): Promise<DeckViewerEmbed> {
  const parts = await createDeckViewerParts(input);
  const root = jsx("section", {
    class: ["hono-decks-embedded-viewer", input.className].filter(Boolean).join(" "),
    "data-hono-decks-viewer": true,
    "data-hono-decks-embed": true,
    "data-deck-slug": parts.slug,
    "data-hono-decks-autohide": autoHideDelay(input.controls),
    ...(parts.meta.availablePages.overview ? { "data-hono-decks-overview-path": parts.meta.paths.overview } : {}),
    "data-hono-decks-slide-position-template": (input.messages ?? resolveMessages("en")).slidePosition,
    "data-hono-decks-progress-text-template": (input.messages ?? resolveMessages("en")).progressText,
    ...(parts.meta.availablePages.print ? { "data-hono-decks-print-path": parts.meta.paths.print } : {}),
    "aria-label": parts.title,
    children: [
      jsx("div", {
        class: "hono-decks-viewer-shell",
        children: [parts.frame.content, parts.controls?.content],
      }),
      input.toc ? parts.toc.content : null,
      renderViewerExtras(parts, input.controls, input.messages ?? resolveMessages("en")),
    ],
  });
  const rootHtml = await renderJsxValue(root);
  const nonceAttribute = input.nonce ? ` nonce="${escapeHtml(input.nonce)}"` : "";
  const embedHtml = `<style data-hono-decks-embed-style${nonceAttribute}>${composeStylesheet({ layers: embeddedViewerStyle(), app: input.style })}</style>${rootHtml}${renderViewerScript(input.nonce)}`;
  return {
    ...parts,
    embed: raw(embedHtml),
    embedHtml,
  };
}

export async function renderDeckViewerPage<E extends Env = any>(input: {
  c: Context<E>;
  deck: CompiledDeck;
  mountPath: string;
  viewerStateQuery?: string;
  remote?: { follow: boolean };
  viewer?: DeckViewerOptions<E>;
  availablePages?: Partial<DeckViewerAvailablePages>;
  exportOptions?: false | DeckExportOptions<E>;
  document?: DeckDocumentOptions<E>;
  messages?: DeckMessageOverrides;
  /** False when the embed route that a Player Card points to is unavailable. */
  twitterPlayer?: boolean;
}): Promise<string> {
  let parts = await createDeckViewerParts({
    deck: input.deck,
    mountPath: input.mountPath,
    viewerStateQuery: input.viewerStateQuery,
    controls: input.viewer?.controls,
    openGraph: input.viewer?.openGraph,
    availablePages: input.availablePages,
    exportPaths: await resolveAuthorizedExportPaths(input.c, input.deck, input.mountPath, input.exportOptions),
  });
  const renderInput: DeckViewerRenderInput<E> = {
    ...parts,
    c: input.c,
    deck: input.deck,
    mountPath: input.mountPath,
  };
  const viewerHead =
    typeof input.viewer?.head === "function" ? await input.viewer.head(renderInput) : await input.viewer?.head;
  const viewerLang =
    typeof input.viewer?.lang === "function" ? await input.viewer.lang(renderInput) : input.viewer?.lang;
  const viewerNonce =
    typeof input.viewer?.nonce === "function" ? await input.viewer.nonce(renderInput) : input.viewer?.nonce;
  const document = await resolveDeckDocument(
    {
      c: input.c,
      surface: "viewer",
      deck: input.deck,
      slug: input.deck.slug,
      mountPath: input.mountPath,
      title: parts.title,
    },
    input.document,
    { head: viewerHead, lang: viewerLang, nonce: viewerNonce },
  );
  const messages = resolveMessages(document.lang, input.messages);
  parts = await createDeckViewerParts({
    deck: input.deck,
    mountPath: input.mountPath,
    viewerStateQuery: input.viewerStateQuery,
    controls: input.viewer?.controls,
    openGraph: input.viewer?.openGraph,
    availablePages: input.availablePages,
    exportPaths: parts.meta.availableExports,
    messages,
  });
  Object.assign(renderInput, parts);
  const customContent = input.viewer?.render ? await input.viewer.render(renderInput) : undefined;
  const content = jsx("main", {
    "data-hono-decks-viewer": true,
    "data-deck-slug": parts.slug,
    "data-hono-decks-autohide": autoHideDelay(input.viewer?.controls),
    ...(parts.meta.availablePages.overview ? { "data-hono-decks-overview-path": parts.meta.paths.overview } : {}),
    "data-hono-decks-slide-position-template": messages.slidePosition,
    "data-hono-decks-progress-text-template": messages.progressText,
    ...(parts.meta.availablePages.print ? { "data-hono-decks-print-path": parts.meta.paths.print } : {}),
    ...(customContent ? { "aria-label": parts.title } : { "aria-labelledby": "hono-decks-viewer-title" }),
    children: customContent ?? [
      jsx("header", {
        class: "hono-decks-viewer-header",
        children: [
          jsx("h1", { id: "hono-decks-viewer-title", class: "hono-decks-viewer-title", children: parts.title }),
          jsx("p", {
            class: "hono-decks-viewer-meta",
            children: formatSlideCount(messages, parts.slides.length),
          }),
        ],
      }),
      jsx("div", {
        class: "hono-decks-viewer-shell",
        children: [parts.frame.content, parts.controls?.content],
      }),
      renderViewerExtras(parts, input.viewer?.controls, messages),
    ],
  });
  const nonceAttribute = documentNonceAttribute(document.nonce);
  const socialHead = renderViewerSocialHead(
    input.c,
    parts.meta,
    input.twitterPlayer === false ? undefined : resolveTwitterPlayerOptions(input.viewer?.openGraph),
  );

  return `<!doctype html>
<html lang="${escapeHtml(document.lang)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${escapeHtml(parts.title)}</title>
  ${socialHead}
  <style${nonceAttribute}>${composeStylesheet({ layers: baseViewerStyle(), app: input.viewer?.style })}</style>
  ${document.head}
</head>
<body>
  ${await renderJsxValue(content)}
  ${renderViewerScript(document.nonce)}
  ${input.remote ? `${remoteStyle(document.nonce)}${remoteIndicator(true, remoteMessages(messages))}${renderRemoteScript("viewer", document.nonce, input.remote.follow, [], remoteMessages(messages))}` : ""}
</body>
</html>`;
}

async function resolveOpenGraphImagePath(
  options: boolean | DeckViewerOpenGraphOptions | undefined,
  input: DeckViewerOpenGraphInput,
): Promise<string | undefined> {
  if (!options) return undefined;
  if (options === true) return input.paths.ogImage;
  if (typeof options.imagePath === "function") return options.imagePath(input);
  return options.imagePath ?? input.paths.ogImage;
}

function renderViewerSocialHead<E extends Env>(
  c: Context<E>,
  meta: DeckPageMeta,
  player?: Required<DeckViewerTwitterPlayerOptions>,
): string {
  if (!meta.imagePath) return "";
  const pageUrl = new URL(meta.paths.viewer, c.req.url).href;
  const imageUrl = new URL(meta.imagePath, c.req.url).href;
  const description = meta.description
    ? `\n  <meta name="description" content="${escapeHtml(meta.description)}" />\n  <meta property="og:description" content="${escapeHtml(meta.description)}" />\n  <meta name="twitter:description" content="${escapeHtml(meta.description)}" />`
    : "";

  return `<meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(meta.title)}" />${description}
  <meta property="og:url" content="${escapeHtml(pageUrl)}" />
  <meta property="og:image" content="${escapeHtml(imageUrl)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${escapeHtml(meta.title)}" />
  <meta name="twitter:card" content="${player ? "player" : "summary_large_image"}" />
  <meta name="twitter:title" content="${escapeHtml(meta.title)}" />
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />${
    player
      ? `
  <meta name="twitter:player" content="${escapeHtml(new URL(meta.paths.embed, c.req.url).href)}" />
  <meta name="twitter:player:width" content="${player.width}" />
  <meta name="twitter:player:height" content="${player.height}" />`
      : ""
  }`;
}

function createDeckToc(deck: CompiledDeck, messages: DeckMessages): DeckTocItem[] {
  return deck.slides.map((slide) => ({
    index: slide.index,
    title: slide.meta.title,
    label: slide.meta.title ?? formatMessage(messages.slide, { number: slide.index + 1 }),
  }));
}

function renderViewerFrame(input: { title: string; renderUrl: string; messages: DeckMessages }): DeckRenderable {
  return jsx("div", {
    class: "hono-decks-viewer-stage",
    "data-hono-decks-frame": true,
    children: jsx("div", {
      class: "hono-decks-viewport",
      "data-viewer-viewport": true,
      tabindex: "0",
      children: [
        jsx("div", {
          class: "hono-decks-frame-stage",
          "data-viewer-stage": true,
          children: jsx("iframe", {
            title: input.title,
            src: input.renderUrl,
          }),
        }),
        renderMobileNavigationControl("previous", input.messages),
        renderMobileNavigationControl("next", input.messages),
      ],
    }),
  });
}

function renderViewerFrameHtml(input: { title: string; renderUrl: string; messages: DeckMessages }): string {
  return `<div class="hono-decks-viewer-stage" data-hono-decks-frame><div class="hono-decks-viewport" data-viewer-viewport tabindex="0"><div class="hono-decks-frame-stage" data-viewer-stage><iframe title="${escapeHtml(input.title)}" src="${escapeHtml(input.renderUrl)}"></iframe></div>${renderMobileNavigationControlHtml("previous", input.messages)}${renderMobileNavigationControlHtml("next", input.messages)}</div></div>`;
}

function renderMobileNavigationControl(action: "previous" | "next", messages: DeckMessages): DeckRenderable {
  return jsx("button", {
    class: `hono-decks-mobile-navigation hono-decks-mobile-navigation-${action}`,
    type: "button",
    "data-hono-decks-mobile-action": action,
    "data-hono-decks-mobile-navigation": action,
    "aria-label": messages[action],
    children: renderControlIcon(action),
  });
}

function renderMobileNavigationControlHtml(action: "previous" | "next", messages: DeckMessages): string {
  const label = messages[action];
  return `<button class="hono-decks-mobile-navigation hono-decks-mobile-navigation-${action}" type="button" data-hono-decks-mobile-action="${action}" data-hono-decks-mobile-navigation="${action}" aria-label="${escapeHtml(label)}">${renderControlIconHtml(action)}</button>`;
}

function renderViewerControls(options: DeckViewerControlsOptions, context: DeckViewerControlsContext): DeckRenderable {
  return jsx("nav", {
    ...controlAttributes(options.attributes),
    class: controlsClassName(options),
    "data-hono-decks-viewer-controls": true,
    "aria-label": options.ariaLabel ?? context.messages.viewerControls,
    children: resolveViewerControlItems(options, context).map((item) =>
      renderViewerControlItem(item, options, context),
    ),
  });
}

function autoHideDelay(options: false | DeckViewerControlsOptions | undefined): string {
  if (options === false || options?.autoHide === false) return "0";
  return "2500";
}

function renderViewerExtras(
  parts: DeckViewerParts,
  options: false | DeckViewerControlsOptions | undefined,
  messages: DeckMessages,
): DeckRenderable {
  const labels = viewerMessages(messages);
  const tocEnabled = options !== false && !options?.hidden?.includes("toc");
  return [
    tocEnabled
      ? jsx("aside", {
          class: "hono-decks-toc-panel",
          "data-hono-decks-toc-panel": true,
          "aria-label": labels.toc,
          hidden: true,
          children: [
            jsx("button", { type: "button", "data-hono-decks-toc-close": true, children: labels.close }),
            parts.toc.content,
          ],
        })
      : null,
    jsx("output", {
      class: "hono-decks-pending-number",
      "data-hono-decks-pending-number": true,
      "aria-live": "polite",
    }),
    jsx("dialog", {
      class: "hono-decks-shortcuts",
      "data-hono-decks-help": true,
      "aria-label": labels.shortcuts,
      children: [
        jsx("h2", { children: labels.shortcuts }),
        jsx("ul", {
          children: [
            labels.next,
            labels.previous,
            labels.firstLast,
            labels.jump,
            ...(parts.meta.availablePages.overview ? [labels.overview] : []),
            ...(tocEnabled ? [labels.toggleToc] : []),
            labels.fullscreen,
            ...(parts.meta.availablePages.print ? [labels.print] : []),
            labels.help,
          ].map((message) => jsx("li", { children: message })),
        }),
        jsx("button", { type: "button", "data-hono-decks-help-close": true, children: labels.close }),
      ],
    }),
  ];
}

function renderViewerToc(slides: DeckTocItem[], messages: DeckMessages): DeckRenderable {
  return jsx("nav", {
    class: "hono-decks-viewer-toc",
    "data-hono-decks-toc": true,
    "aria-label": messages.slideNavigation,
    children: jsx("ol", {
      children: slides.map((slide) =>
        jsx("li", {
          children: jsx("button", {
            type: "button",
            "data-action": "goTo",
            "data-slide-index": String(slide.index),
            children: `${slide.index + 1}. ${slide.label}`,
          }),
        }),
      ),
    }),
  });
}

function renderViewerTocHtml(slides: DeckTocItem[], messages: DeckMessages): string {
  const items = slides
    .map(
      (slide) =>
        `<li><button type="button" data-action="goTo" data-slide-index="${slide.index}">${slide.index + 1}. ${escapeHtml(slide.label)}</button></li>`,
    )
    .join("");
  return `<nav class="hono-decks-viewer-toc" data-hono-decks-toc aria-label="${escapeHtml(messages.slideNavigation)}"><ol>${items}</ol></nav>`;
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

function buildViewerControlDefaults(context: DeckViewerControlsContext): DeckViewerControlDefaults {
  return {
    back: { type: "default", key: "back" },
    previous: { type: "default", key: "previous" },
    position: { type: "default", key: "position" },
    next: { type: "default", key: "next" },
    fullscreen: { type: "default", key: "fullscreen" },
    toc: { type: "default", key: "toc" },
    overview: context.meta.availablePages.overview ? { type: "default", key: "overview" } : null,
    print: context.meta.availablePages.print ? { type: "default", key: "print" } : null,
    exportPdf: context.meta.availableExports.pdf ? { type: "default", key: "exportPdf" } : null,
    exportPng: context.meta.availableExports.png ? { type: "default", key: "exportPng" } : null,
  };
}

function resolveViewerControlItems(
  options: DeckViewerControlsOptions,
  context: DeckViewerControlsContext,
): Array<Exclude<DeckViewerControlItem, null | false | undefined>> {
  const defaults = buildViewerControlDefaults(context);
  const baseItems = [
    defaults.back,
    defaults.previous,
    defaults.position,
    defaults.next,
    defaults.fullscreen,
    defaults.toc,
    defaults.overview,
    defaults.print,
    defaults.exportPdf,
    defaults.exportPng,
  ];
  const items =
    typeof options.items === "function"
      ? options.items(defaults, context)
      : (options.items ?? [
          ...resolveViewerControlSlotItems(options.before, context),
          ...filterHiddenDefaultItems(baseItems, options.hidden),
          ...resolveViewerControlSlotItems(options.after, context),
        ]);
  return items
    .filter((item): item is Exclude<DeckViewerControlItem, null | false | undefined> => Boolean(item))
    .map((item) => applyViewerControlLabels(item, options.labels));
}

function renderViewerControlItem(
  item: Exclude<DeckViewerControlItem, null | false | undefined>,
  options: DeckViewerControlsOptions,
  context: DeckViewerControlsContext,
): DeckRenderable {
  const renderDefault = () => renderBaseViewerControlItem(item, options, context);
  return options.renderItem?.(item, context, renderDefault) ?? renderDefault();
}

function renderBaseViewerControlItem(
  item: Exclude<DeckViewerControlItem, null | false | undefined>,
  options: DeckViewerControlsOptions,
  context: DeckViewerControlsContext,
): DeckRenderable {
  if (item.type === "link") {
    const ariaLabel = item.icon ? String(item.attributes?.["aria-label"] ?? item.label) : undefined;
    return jsx("a", {
      ...linkAttributes(item.attributes),
      ...(safeHref(item.href) ? { href: safeHref(item.href) } : {}),
      ...(item.download ? { download: item.download } : {}),
      ...classAttribute(options.itemClassName, item.className),
      ...(item.icon ? { "aria-label": ariaLabel, title: ariaLabel } : {}),
      children: item.icon ? renderControlIcon(item.icon) : item.label,
    });
  }

  if (item.type === "render") {
    return item.render({ context });
  }

  return renderDefaultViewerControlItem(item, options, context);
}

function renderDefaultViewerControlItem(
  item: DeckViewerDefaultControlItem,
  options: DeckViewerControlsOptions,
  context: DeckViewerControlsContext,
): DeckRenderable {
  const itemProps = {
    ...linkAttributes(item.attributes),
    ...classAttribute(options.itemClassName, item.className),
  };
  switch (item.key) {
    case "back":
      return jsx("a", {
        ...itemProps,
        href: context.mountPath,
        "data-hono-decks-back-link": true,
        ...(item.label === undefined
          ? { "aria-label": context.messages.deckList, title: context.messages.deckList }
          : {}),
        children: item.label ?? renderControlIcon("deck-list"),
      });
    case "previous":
      return renderIconButton("previous", item, itemProps, context.messages);
    case "position": {
      // A progress bar along the bottom edge of the slide. The visually hidden text
      // keeps "n / total" for assistive technology and scripts; the viewer runtime
      // updates both and sets --hono-decks-progress (no inline style, so strict CSP works).
      const total = Math.max(context.slides.length, 1);
      const progress: DeckViewerProgressStyle =
        options.progress === "count" || options.progress === "both" ? options.progress : "bar";
      return jsx("div", {
        ...itemProps,
        ...classAttribute("hono-decks-progress", options.itemClassName, item.className),
        role: "progressbar",
        "aria-label": item.label ?? context.messages.slideProgress,
        "aria-valuemin": "1",
        "aria-valuemax": String(total),
        "aria-valuenow": "1",
        "aria-valuetext": formatMessage(context.messages.slidePosition, { current: 1, total }),
        "data-slide-position": true,
        "data-hono-decks-position": true,
        "data-hono-decks-progress": progress,
        children: [
          progress === "count" ? null : jsx("span", { class: "hono-decks-progress-bar", "aria-hidden": "true" }),
          jsx("span", {
            class: "hono-decks-progress-text",
            children: formatMessage(context.messages.progressText, { current: 1, total }),
          }),
        ],
      });
    }
    case "next":
      return renderIconButton("next", item, itemProps, context.messages);
    case "fullscreen":
      return renderIconButton("fullscreen", item, itemProps, context.messages);
    case "toc":
      return renderIconButton("toc", item, itemProps, context.messages);
    case "overview":
      return jsx("a", {
        ...itemProps,
        href: context.meta.paths.overview,
        "data-hono-decks-overview-link": true,
        ...(item.label === undefined
          ? { "aria-label": context.messages.overview, title: context.messages.overview }
          : {}),
        children: item.label ?? renderControlIcon("overview"),
      });
    case "print":
      return jsx("a", {
        ...itemProps,
        href: context.meta.paths.print,
        "data-hono-decks-print": true,
        ...(item.label === undefined ? { "aria-label": context.messages.print, title: context.messages.print } : {}),
        children: item.label ?? renderControlIcon("print"),
      });
    case "exportPdf":
      return jsx("a", {
        ...itemProps,
        href: context.meta.paths.exportPdf,
        download: `${safeFilename(context.meta.title)}.pdf`,
        "data-hono-decks-export": "pdf",
        ...(item.label === undefined
          ? { "aria-label": context.messages.exportPdf, title: context.messages.exportPdf }
          : {}),
        children: item.label ?? renderControlIcon("export-pdf"),
      });
    case "exportPng":
      return jsx("a", {
        ...itemProps,
        href: context.meta.paths.exportPng,
        download: `${safeFilename(context.meta.title)}.png`,
        "data-hono-decks-export": "png",
        ...(item.label === undefined
          ? { "aria-label": context.messages.exportPng, title: context.messages.exportPng }
          : {}),
        children: item.label ?? renderControlIcon("export-png"),
      });
  }
}

function renderIconButton(
  action: Extract<DeckViewerControlKey, "previous" | "next" | "fullscreen" | "toc">,
  item: DeckViewerDefaultControlItem,
  itemProps: Record<string, string | boolean>,
  messages: DeckMessages,
): DeckRenderable {
  const iconName = controlIconNameForKey(action);
  const label = messages[action];
  return jsx("button", {
    ...itemProps,
    type: "button",
    "data-action": action,
    "data-hono-decks-navigation-control": action,
    ...(action === "toc" ? { "aria-expanded": "false" } : {}),
    ...(item.label === undefined ? { "aria-label": label, title: label } : {}),
    children: item.label ?? renderControlIcon(iconName),
  });
}

function controlIconNameForKey(key: DeckViewerControlKey): DeckControlIconName {
  switch (key) {
    case "back":
      return "deck-list";
    case "previous":
      return "previous";
    case "next":
      return "next";
    case "fullscreen":
      return "fullscreen";
    case "toc":
      return "toc";
    case "overview":
      return "overview";
    case "print":
      return "print";
    case "exportPdf":
      return "export-pdf";
    case "exportPng":
      return "export-png";
    case "position":
      return "viewer";
  }
}

function controlsClassName(options: DeckViewerControlsOptions): string {
  return ["hono-decks-viewer-controls", options.className].filter(Boolean).join(" ");
}

function resolveViewerControlSlotItems(
  items: DeckViewerControlSlotItems | undefined,
  context: DeckViewerControlsContext,
): DeckViewerControlItem[] {
  return typeof items === "function" ? items(context) : (items ?? []);
}

function filterHiddenDefaultItems(
  items: DeckViewerControlItem[],
  hidden: DeckViewerControlKey[] | undefined,
): DeckViewerControlItem[] {
  if (!hidden?.length) return items;

  const hiddenKeys = new Set(hidden);
  return items.filter((item) => !item || item.type !== "default" || !hiddenKeys.has(item.key));
}

function applyViewerControlLabels(
  item: Exclude<DeckViewerControlItem, null | false | undefined>,
  labels: DeckViewerControlsOptions["labels"],
): Exclude<DeckViewerControlItem, null | false | undefined> {
  if (item.type !== "default" || item.label !== undefined) return item;

  const label = labels?.[item.key];
  return label === undefined ? item : { ...item, label };
}

function linkAttributes(attributes: DeckViewerLinkControlItem["attributes"]): Record<string, string | boolean> {
  const props: Record<string, string | boolean> = {};
  for (const [name, value] of Object.entries(attributes ?? {})) {
    if (!isSafeAttributeName(name) || value === false || value === undefined) continue;
    props[name] = value;
  }
  return props;
}

function controlAttributes(attributes: DeckViewerControlsOptions["attributes"]): Record<string, string | boolean> {
  const props = linkAttributes(attributes);
  delete props.class;
  delete props["aria-label"];
  delete props["data-hono-decks-viewer-controls"];
  return props;
}

function classAttribute(...classNames: Array<string | undefined>): { class?: string } {
  const className = classNames.filter(Boolean).join(" ");
  return className ? { class: className } : {};
}

function isSafeAttributeName(value: string): boolean {
  return /^[A-Za-z_:][A-Za-z0-9:_.-]*$/.test(value) && !/^on/i.test(value);
}

function safeHref(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return value;
  if (/^(javascript:|data:|vbscript:)/i.test(trimmed)) return undefined;
  if (/^[^/?#.]+:/i.test(trimmed)) return undefined;
  return value;
}
