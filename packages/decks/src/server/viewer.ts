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
  controls?: boolean;
  backLink?: DeckViewerBackLinkInput;
  style?: string;
  head?: MaybePromise<DeckRenderable>;
  render?(input: DeckViewerRenderInput): MaybePromise<DeckRenderable>;
}

export interface DeckViewerBackLink {
  href: string;
  label: string;
}

export type DeckViewerBackLinkInput = false | string | Partial<DeckViewerBackLink>;

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
  backLink?: DeckViewerBackLink;
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
  controls?: boolean;
  backLink?: DeckViewerBackLinkInput;
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
    backLink: resolveViewerBackLink(basePath, input.backLink),
    exportPdfPath,
    exportPngPath,
  };

  return {
    slug,
    title,
    renderUrl,
    frame: renderViewerFrame({ title, renderUrl }),
    frameHtml: renderViewerFrameHtml({ title, renderUrl }),
    controls: input.controls === false ? null : renderViewerControls(meta),
    controlsHtml: input.controls === false ? null : renderViewerControlsHtml(meta),
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
    backLink: input.viewer?.backLink,
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

function renderViewerControls(meta: DeckPageMeta): DeckRenderable {
  const backLink = meta.backLink
    ? jsx("a", {
        href: meta.backLink.href,
        "data-hono-decks-back-link": true,
        children: meta.backLink.label,
      })
    : null;
  const exportLinks = [
    meta.exportPdfPath
      ? jsx("a", {
          href: meta.exportPdfPath,
          download: `${safeFilename(meta.title)}.pdf`,
          "data-hono-decks-export": "pdf",
          children: "PDF",
        })
      : null,
    meta.exportPngPath
      ? jsx("a", {
          href: meta.exportPngPath,
          download: `${safeFilename(meta.title)}.png`,
          "data-hono-decks-export": "png",
          children: "PNG",
        })
      : null,
  ].filter(Boolean);

  return jsx("nav", {
    class: "hono-decks-viewer-controls",
    "data-hono-decks-viewer-controls": true,
    "aria-label": "Viewer controls",
    children: [
      backLink,
      jsx("button", { type: "button", "data-action": "previous", children: "Prev" }),
      jsx("span", { "data-slide-position": true, children: "1 / ?" }),
      jsx("button", { type: "button", "data-action": "next", children: "Next" }),
      jsx("button", { type: "button", "data-action": "fullscreen", children: "Full" }),
      ...exportLinks,
    ],
  });
}

function renderViewerControlsHtml(meta: DeckPageMeta): string {
  const backLink = meta.backLink
    ? `<a href="${escapeHtml(meta.backLink.href)}" data-hono-decks-back-link>${escapeHtml(meta.backLink.label)}</a>`
    : "";
  const exportLinks = [
    meta.exportPdfPath
      ? `<a href="${escapeHtml(meta.exportPdfPath)}" download="${escapeHtml(safeFilename(meta.title))}.pdf" data-hono-decks-export="pdf">PDF</a>`
      : "",
    meta.exportPngPath
      ? `<a href="${escapeHtml(meta.exportPngPath)}" download="${escapeHtml(safeFilename(meta.title))}.png" data-hono-decks-export="png">PNG</a>`
      : "",
  ].join("");
  return `<nav class="hono-decks-viewer-controls" data-hono-decks-viewer-controls aria-label="Viewer controls">${backLink}<button type="button" data-action="previous">Prev</button><span data-slide-position>1 / ?</span><button type="button" data-action="next">Next</button><button type="button" data-action="fullscreen">Full</button>${exportLinks}</nav>`;
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

function resolveViewerBackLink(basePath: string, input: DeckViewerBackLinkInput | undefined): DeckViewerBackLink | undefined {
  if (input === false) return undefined;
  if (typeof input === "string") return { href: input, label: "Decks" };
  return {
    href: input?.href ?? basePath,
    label: input?.label ?? "Decks",
  };
}

function safeFilename(value: string): string {
  const normalized = value
    .trim()
    .replaceAll(/[^a-zA-Z0-9._-]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
  return normalized || "deck";
}
