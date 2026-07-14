import type { Context, Env } from "hono";
import { raw } from "hono/html";
import { jsx } from "hono/jsx/jsx-runtime";
import type { CompiledDeck } from "../deck/model";
import type { DeckRenderable, MaybePromise } from "../renderer/compiled-render";
import { controlIconLabel, renderControlIcon, type DeckControlIconName } from "../renderer/control-icons";
import { renderJsxValue } from "../renderer/jsx-renderer";
import type { DeckExportOptions, DeckViewerExportPaths } from "./browser-export";
import { resolveAuthorizedExportPaths } from "./browser-export";
import { renderViewerScript } from "./viewer-script";
import { baseViewerStyle, embeddedViewerStyle } from "./viewer-style";
import { createDeckPaths, type DeckPaths } from "./paths";
import {
  documentNonceAttribute,
  resolveDeckDocument,
  type DeckDocumentOptions,
} from "./document";

export interface DeckViewerOptions<E extends Env = any> {
  controls?: false | DeckViewerControlsOptions;
  style?: string;
  head?: MaybePromise<DeckRenderable> | ((input: DeckViewerRenderInput<E>) => MaybePromise<DeckRenderable>);
  lang?: string | ((input: DeckViewerRenderInput<E>) => MaybePromise<string>);
  nonce?: string | ((input: DeckViewerRenderInput<E>) => MaybePromise<string | undefined>);
  render?(input: DeckViewerRenderInput<E>): MaybePromise<DeckRenderable>;
}

export type DeckViewerControlKey =
  | "back"
  | "previous"
  | "position"
  | "next"
  | "fullscreen"
  | "print"
  | "exportPdf"
  | "exportPng";

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
  print: DeckViewerDefaultControlItem;
  exportPdf: DeckViewerDefaultControlItem | null;
  exportPng: DeckViewerDefaultControlItem | null;
}

export interface DeckViewerControlsContext {
  slug: string;
  title: string;
  mountPath: string;
  meta: DeckPageMeta;
  slides: DeckTocItem[];
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
  exportPaths?: DeckViewerExportPaths;
  style?: string;
  toc?: boolean;
  className?: string;
  nonce?: string;
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
  exportPaths?: DeckViewerExportPaths;
}): Promise<DeckViewerParts> {
  const slug = input.deck.slug;
  const title = input.deck.meta.title ?? slug;
  const basePath = input.mountPath.replace(/\/$/, "");
  const paths = createDeckPaths(basePath, slug);
  const renderUrl = `${paths.render}${input.viewerStateQuery ?? ""}`;
  const slides = createDeckToc(input.deck);
  const meta: DeckPageMeta = {
    title,
    description: input.deck.meta.description,
    paths,
    availableExports: input.exportPaths ?? {},
  };
  const controlsInput = input.controls === false ? false : input.controls ?? {};
  const controlsContext: DeckViewerControlsContext = { slug, title, mountPath: basePath, meta, slides };

  const controls = controlsInput === false ? null : renderViewerControls(controlsInput, controlsContext);

  return {
    slug,
    title,
    renderUrl,
    frame: {
      content: renderViewerFrame({ title, renderUrl }),
      html: renderViewerFrameHtml({ title, renderUrl }),
    },
    controls: controls ? { content: controls, html: await renderJsxValue(controls) } : null,
    toc: { content: renderViewerToc(slides), html: renderViewerTocHtml(slides) },
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
    "data-hono-decks-print-path": parts.meta.paths.print,
    "aria-label": parts.title,
    children: [
      jsx("div", {
        class: "hono-decks-viewer-shell",
        children: [parts.frame.content, parts.controls?.content],
      }),
      input.toc ? parts.toc.content : null,
    ],
  });
  const rootHtml = await renderJsxValue(root);
  const nonceAttribute = input.nonce ? ` nonce="${escapeHtml(input.nonce)}"` : "";
  const embedHtml = `<style data-hono-decks-embed-style${nonceAttribute}>${embeddedViewerStyle()}${input.style ?? ""}</style>${rootHtml}${renderViewerScript(input.nonce)}`;
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
  viewer?: DeckViewerOptions<E>;
  exportOptions?: false | DeckExportOptions<E>;
  document?: DeckDocumentOptions<E>;
}): Promise<string> {
  const parts = await createDeckViewerParts({
    deck: input.deck,
    mountPath: input.mountPath,
    viewerStateQuery: input.viewerStateQuery,
    controls: input.viewer?.controls,
    exportPaths: await resolveAuthorizedExportPaths(input.c, input.deck, input.mountPath, input.exportOptions),
  });
  const renderInput: DeckViewerRenderInput<E> = {
    ...parts,
    c: input.c,
    deck: input.deck,
    mountPath: input.mountPath,
  };
  const customContent = input.viewer?.render ? await input.viewer.render(renderInput) : undefined;
  const content = jsx("main", {
      "data-hono-decks-viewer": true,
      "data-deck-slug": parts.slug,
      "data-hono-decks-print-path": parts.meta.paths.print,
      ...(customContent
        ? { "aria-label": parts.title }
        : { "aria-labelledby": "hono-decks-viewer-title" }),
      children: customContent ?? [
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
          children: [parts.frame.content, parts.controls?.content],
        }),
      ],
    });
  const viewerHead =
    typeof input.viewer?.head === "function" ? await input.viewer.head(renderInput) : await input.viewer?.head;
  const viewerLang = typeof input.viewer?.lang === "function" ? await input.viewer.lang(renderInput) : input.viewer?.lang;
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
  const nonceAttribute = documentNonceAttribute(document.nonce);

  return `<!doctype html>
<html lang="${escapeHtml(document.lang)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${escapeHtml(parts.title)}</title>
  <style${nonceAttribute}>${baseViewerStyle()}${input.viewer?.style ?? ""}</style>
  ${document.head}
</head>
<body>
  ${await renderJsxValue(await content)}
  ${renderViewerScript(document.nonce)}
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
      children: [
        jsx("div", {
          class: "hono-decks-frame-stage",
          "data-viewer-stage": true,
          children: jsx("iframe", {
            title: input.title,
            src: input.renderUrl,
          }),
        }),
        jsx("button", {
          class: "hono-decks-viewer-navigation-layer hono-decks-viewer-navigation-previous",
          type: "button",
          "data-viewer-navigation": "previous",
          "aria-label": "Previous slide",
        }),
        jsx("button", {
          class: "hono-decks-viewer-navigation-layer hono-decks-viewer-navigation-next",
          type: "button",
          "data-viewer-navigation": "next",
          "aria-label": "Next slide",
        }),
      ],
    }),
  });
}

function renderViewerFrameHtml(input: { title: string; renderUrl: string }): string {
  return `<div class="hono-decks-viewer-stage" data-hono-decks-frame><div class="hono-decks-viewport" data-viewer-viewport tabindex="0"><div class="hono-decks-frame-stage" data-viewer-stage><iframe title="${escapeHtml(input.title)}" src="${escapeHtml(input.renderUrl)}"></iframe></div><button class="hono-decks-viewer-navigation-layer hono-decks-viewer-navigation-previous" type="button" data-viewer-navigation="previous" aria-label="Previous slide"></button><button class="hono-decks-viewer-navigation-layer hono-decks-viewer-navigation-next" type="button" data-viewer-navigation="next" aria-label="Next slide"></button></div></div>`;
}

function renderViewerControls(options: DeckViewerControlsOptions, context: DeckViewerControlsContext): DeckRenderable {
  return jsx("nav", {
    ...controlAttributes(options.attributes),
    class: controlsClassName(options),
    "data-hono-decks-viewer-controls": true,
    "aria-label": options.ariaLabel ?? "Viewer controls",
    children: resolveViewerControlItems(options, context).map((item) => renderViewerControlItem(item, options, context)),
  });
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
    print: { type: "default", key: "print" },
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
        ...(item.label === undefined ? { "aria-label": controlIconLabel("deck-list"), title: controlIconLabel("deck-list") } : {}),
        children: item.label ?? renderControlIcon("deck-list"),
      });
    case "previous":
      return renderIconButton("previous", item, itemProps);
    case "position":
      return jsx("span", {
        ...itemProps,
        "data-slide-position": true,
        "data-hono-decks-position": true,
        children: item.label ?? "1 / ?",
      });
    case "next":
      return renderIconButton("next", item, itemProps);
    case "fullscreen":
      return renderIconButton("fullscreen", item, itemProps);
    case "print":
      return jsx("a", {
        ...itemProps,
        href: context.meta.paths.print,
        "data-hono-decks-print": true,
        ...(item.label === undefined ? { "aria-label": controlIconLabel("print"), title: controlIconLabel("print") } : {}),
        children: item.label ?? renderControlIcon("print"),
      });
    case "exportPdf":
      return jsx("a", {
        ...itemProps,
        href: context.meta.paths.exportPdf,
        download: `${safeFilename(context.meta.title)}.pdf`,
        "data-hono-decks-export": "pdf",
        ...(item.label === undefined ? { "aria-label": controlIconLabel("export-pdf"), title: controlIconLabel("export-pdf") } : {}),
        children: item.label ?? renderControlIcon("export-pdf"),
      });
    case "exportPng":
      return jsx("a", {
        ...itemProps,
        href: context.meta.paths.exportPng,
        download: `${safeFilename(context.meta.title)}.png`,
        "data-hono-decks-export": "png",
        ...(item.label === undefined ? { "aria-label": controlIconLabel("export-png"), title: controlIconLabel("export-png") } : {}),
        children: item.label ?? renderControlIcon("export-png"),
      });
  }
}

function renderIconButton(
  action: Extract<DeckViewerControlKey, "previous" | "next" | "fullscreen">,
  item: DeckViewerDefaultControlItem,
  itemProps: Record<string, string | boolean>,
): DeckRenderable {
  const iconName = controlIconNameForKey(action);
  const label = controlIconLabel(iconName);
  return jsx("button", {
    ...itemProps,
    type: "button",
    "data-action": action,
    "data-hono-decks-navigation-control": action,
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
