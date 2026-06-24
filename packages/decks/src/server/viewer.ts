import type { Context } from "hono";
import { jsx } from "hono/jsx/jsx-runtime";
import type { CompiledDeck } from "../deck/model";
import type { DeckRenderable, MaybePromise } from "../renderer/compiled-render";
import { renderJsxValue } from "../renderer/jsx-renderer";
import type { DeckExportOptions, DeckViewerExportPaths } from "./browser-export";
import { resolveAuthorizedExportPaths } from "./browser-export";
import { renderViewerScript } from "./viewer-script";
import { baseViewerStyle } from "./viewer-style";

export interface DeckViewerOptions {
  controls?: false | DeckViewerControlsOptions;
  style?: string;
  head?: MaybePromise<DeckRenderable>;
  render?(input: DeckViewerRenderInput): MaybePromise<DeckRenderable>;
}

export type DeckViewerControlKey =
  | "back"
  | "previous"
  | "position"
  | "next"
  | "fullscreen"
  | "exportPdf"
  | "exportPng";

export interface DeckViewerControlsOptions {
  className?: string;
  itemClassName?: string;
  items?: DeckViewerControlItem[] | DeckViewerControlsItemsResolver;
}

export type DeckViewerControlsItemsResolver = (
  defaults: DeckViewerControlDefaults,
  context: DeckViewerControlsContext,
) => DeckViewerControlItem[];

export interface DeckViewerControlDefaults {
  back: DeckViewerControlItem;
  previous: DeckViewerControlItem;
  position: DeckViewerControlItem;
  next: DeckViewerControlItem;
  fullscreen: DeckViewerControlItem;
  exportPdf: DeckViewerControlItem | null;
  exportPng: DeckViewerControlItem | null;
}

export interface DeckViewerControlsContext {
  slug: string;
  title: string;
  mountPath: string;
  meta: DeckPageMeta;
  slides: DeckTocItem[];
}

export type DeckViewerControlItem = DeckViewerDefaultControlItem | DeckViewerLinkControlItem | null | false | undefined;

export interface DeckViewerDefaultControlItem {
  type: "default";
  key: DeckViewerControlKey;
}

export interface DeckViewerLinkControlItem {
  type: "link";
  key?: string;
  href: string;
  label: string;
  download?: string;
  attributes?: Record<string, string | boolean | undefined>;
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

export function createDeckViewerParts(input: {
  deck: CompiledDeck;
  mountPath: string;
  controls?: false | DeckViewerControlsOptions;
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
  const controlsInput = input.controls === false ? false : input.controls ?? {};
  const controlsContext: DeckViewerControlsContext = { slug, title, mountPath: basePath, meta, slides };

  return {
    slug,
    title,
    renderUrl,
    frame: renderViewerFrame({ title, renderUrl }),
    frameHtml: renderViewerFrameHtml({ title, renderUrl }),
    controls: controlsInput === false ? null : renderViewerControls(controlsInput, controlsContext),
    controlsHtml: controlsInput === false ? null : renderViewerControlsHtml(controlsInput, controlsContext),
    toc: renderViewerToc(slides),
    tocHtml: renderViewerTocHtml(slides),
    slides,
    meta,
  };
}

export async function renderDeckViewerPage(input: {
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

function renderViewerControls(options: DeckViewerControlsOptions, context: DeckViewerControlsContext): DeckRenderable {
  return jsx("nav", {
    class: controlsClassName(options),
    "data-hono-decks-viewer-controls": true,
    "aria-label": "Viewer controls",
    children: resolveViewerControlItems(options, context).map((item) => renderViewerControlItem(item, options, context)),
  });
}

function renderViewerControlsHtml(options: DeckViewerControlsOptions, context: DeckViewerControlsContext): string {
  const items = resolveViewerControlItems(options, context)
    .map((item) => renderViewerControlItemHtml(item, options, context))
    .join("");
  return `<nav class="${escapeHtml(controlsClassName(options))}" data-hono-decks-viewer-controls aria-label="Viewer controls">${items}</nav>`;
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
    exportPdf: context.meta.exportPdfPath ? { type: "default", key: "exportPdf" } : null,
    exportPng: context.meta.exportPngPath ? { type: "default", key: "exportPng" } : null,
  };
}

function resolveViewerControlItems(
  options: DeckViewerControlsOptions,
  context: DeckViewerControlsContext,
): Array<Exclude<DeckViewerControlItem, null | false | undefined>> {
  const defaults = buildViewerControlDefaults(context);
  const items =
    typeof options.items === "function"
      ? options.items(defaults, context)
      : (options.items ?? [
          defaults.back,
          defaults.previous,
          defaults.position,
          defaults.next,
          defaults.fullscreen,
          defaults.exportPdf,
          defaults.exportPng,
        ]);
  return items.filter((item): item is Exclude<DeckViewerControlItem, null | false | undefined> => Boolean(item));
}

function renderViewerControlItem(
  item: Exclude<DeckViewerControlItem, null | false | undefined>,
  options: DeckViewerControlsOptions,
  context: DeckViewerControlsContext,
): DeckRenderable {
  if (item.type === "link") {
    return jsx("a", {
      ...linkAttributes(item.attributes),
      href: item.href,
      ...(item.download ? { download: item.download } : {}),
      ...(options.itemClassName ? { class: options.itemClassName } : {}),
      children: item.label,
    });
  }

  return renderDefaultViewerControlItem(item.key, options, context);
}

function renderDefaultViewerControlItem(
  key: DeckViewerControlKey,
  options: DeckViewerControlsOptions,
  context: DeckViewerControlsContext,
): DeckRenderable {
  const classProps = options.itemClassName ? { class: options.itemClassName } : {};
  switch (key) {
    case "back":
      return jsx("a", { href: context.mountPath, "data-hono-decks-back-link": true, ...classProps, children: "Decks" });
    case "previous":
      return jsx("button", { type: "button", "data-action": "previous", ...classProps, children: "Prev" });
    case "position":
      return jsx("span", { "data-slide-position": true, ...classProps, children: "1 / ?" });
    case "next":
      return jsx("button", { type: "button", "data-action": "next", ...classProps, children: "Next" });
    case "fullscreen":
      return jsx("button", { type: "button", "data-action": "fullscreen", ...classProps, children: "Full" });
    case "exportPdf":
      return jsx("a", {
        href: context.meta.exportPdfPath ?? "",
        download: `${safeFilename(context.meta.title)}.pdf`,
        "data-hono-decks-export": "pdf",
        ...classProps,
        children: "PDF",
      });
    case "exportPng":
      return jsx("a", {
        href: context.meta.exportPngPath ?? "",
        download: `${safeFilename(context.meta.title)}.png`,
        "data-hono-decks-export": "png",
        ...classProps,
        children: "PNG",
      });
  }
}

function renderViewerControlItemHtml(
  item: Exclude<DeckViewerControlItem, null | false | undefined>,
  options: DeckViewerControlsOptions,
  context: DeckViewerControlsContext,
): string {
  if (item.type === "link") {
    const attributes = htmlAttributes({
      ...item.attributes,
      href: item.href,
      ...(item.download ? { download: item.download } : {}),
      ...(options.itemClassName ? { class: options.itemClassName } : {}),
    });
    return `<a${attributes}>${escapeHtml(item.label)}</a>`;
  }

  return renderDefaultViewerControlItemHtml(item.key, options, context);
}

function renderDefaultViewerControlItemHtml(
  key: DeckViewerControlKey,
  options: DeckViewerControlsOptions,
  context: DeckViewerControlsContext,
): string {
  const classAttribute = options.itemClassName ? ` class="${escapeHtml(options.itemClassName)}"` : "";
  switch (key) {
    case "back":
      return `<a href="${escapeHtml(context.mountPath)}" data-hono-decks-back-link${classAttribute}>Decks</a>`;
    case "previous":
      return `<button type="button" data-action="previous"${classAttribute}>Prev</button>`;
    case "position":
      return `<span data-slide-position${classAttribute}>1 / ?</span>`;
    case "next":
      return `<button type="button" data-action="next"${classAttribute}>Next</button>`;
    case "fullscreen":
      return `<button type="button" data-action="fullscreen"${classAttribute}>Full</button>`;
    case "exportPdf":
      return `<a href="${escapeHtml(context.meta.exportPdfPath ?? "")}" download="${escapeHtml(safeFilename(context.meta.title))}.pdf" data-hono-decks-export="pdf"${classAttribute}>PDF</a>`;
    case "exportPng":
      return `<a href="${escapeHtml(context.meta.exportPngPath ?? "")}" download="${escapeHtml(safeFilename(context.meta.title))}.png" data-hono-decks-export="png"${classAttribute}>PNG</a>`;
  }
}

function controlsClassName(options: DeckViewerControlsOptions): string {
  return ["hono-decks-viewer-controls", options.className].filter(Boolean).join(" ");
}

function linkAttributes(attributes: DeckViewerLinkControlItem["attributes"]): Record<string, string | boolean> {
  const props: Record<string, string | boolean> = {};
  for (const [name, value] of Object.entries(attributes ?? {})) {
    if (!isSafeAttributeName(name) || value === false || value === undefined) continue;
    props[name] = value;
  }
  return props;
}

function htmlAttributes(attributes: Record<string, string | boolean | undefined>): string {
  return Object.entries(attributes)
    .filter(([name, value]) => isSafeAttributeName(name) && value !== false && value !== undefined)
    .map(([name, value]) => (value === true ? ` ${name}` : ` ${name}="${escapeHtml(String(value))}"`))
    .join("");
}

function isSafeAttributeName(value: string): boolean {
  return /^[A-Za-z_:][A-Za-z0-9:_.-]*$/.test(value);
}
