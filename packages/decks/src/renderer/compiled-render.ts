import { RenderError } from "../deck/model";
import type { AssetRef, CompiledDeck, CompiledSlide } from "../deck/model";
import { backgroundStyle, rewriteLocalAssetUrls } from "./asset-rewrite";
import {
  builtInSlideComponents,
  createMdxComponents,
  defineSlideComponents,
  renderJsxValue,
  renderJsxValueSync,
  renderSlideNodes,
  renderSlideNodesAsync,
} from "./jsx-renderer";
import type { DeckRenderable, SlideComponentInput, SlideComponentRegistry } from "./jsx-renderer";

export { defineSlideComponents };
export { createMdxComponents };
export { builtInSlideComponents };
export { renderCompiledDeckPage, renderCompiledDeckPageAsync } from "./presentation-page";
export type {
  DeckRenderable,
  MaybePromise,
  SlideComponent,
  SlideComponentDefinition,
  SlideComponentInput,
  SlideComponentProps,
  SlideComponentRegistry,
} from "./jsx-renderer";

export function renderCompiledDeck(
  deck: CompiledDeck,
  input: {
    components?: SlideComponentRegistry | Record<string, SlideComponentInput>;
    speakerNotes?: boolean;
  } = {},
): string {
  const components = normalizeComponents(input.components);
  return `<main class="hono-decks-stage" data-hono-decks-stage data-deck-slug="${escapeHtml(deck.slug)}"><div class="hono-decks-deck" data-hono-decks-deck>${deck.slides
    .map((slide) => renderCompiledSlide(slide, deck.assets, { components, deck, speakerNotes: input.speakerNotes }))
    .join("\n")}</div></main>`;
}

export async function renderCompiledDeckAsync(
  deck: CompiledDeck,
  input: {
    components?: SlideComponentRegistry | Record<string, SlideComponentInput>;
    speakerNotes?: boolean;
  } = {},
): Promise<string> {
  const components = normalizeComponents(input.components);
  const slides = await Promise.all(
    deck.slides.map((slide) =>
      renderCompiledSlideAsync(slide, deck.assets, { components, deck, speakerNotes: input.speakerNotes }),
    ),
  );
  return `<main class="hono-decks-stage" data-hono-decks-stage data-deck-slug="${escapeHtml(deck.slug)}"><div class="hono-decks-deck" data-hono-decks-deck>${slides.join(
    "\n",
  )}</div></main>`;
}

export function renderCompiledSlide(
  slide: CompiledSlide,
  assets: AssetRef[] = [],
  input: {
    components?: SlideComponentRegistry | Record<string, SlideComponentInput>;
    deck?: CompiledDeck;
    speakerNotes?: boolean;
    slideState?: "active" | "inactive";
  } = {},
): string {
  const components = normalizeComponents(input.components);
  const slideState = input.slideState ?? "inactive";
  const layout = slide.meta.layout ?? "default";
  const classes = ["slide", `layout-${safeClass(layout)}`, slide.meta.className ? safeClass(slide.meta.className) : ""]
    .filter(Boolean)
    .join(" ");
  const notes = slide.notes ?? slide.meta.notes;
  const notesHtml =
    input.speakerNotes === false || !notes ? "" : `<aside class="speaker-notes" hidden>${escapeHtml(notes)}</aside>`;
  const html = renderSlideBodySync(slide, assets, { ...input, components });
  const style = slideStyleAttribute(slide, assets);
  const transition = slide.meta.transition ? ` data-transition="${escapeHtml(safeClass(slide.meta.transition))}"` : "";

  return `<section class="${classes}" data-slide-index="${slide.index}" data-slide-state="${slideState}"${slide.meta.title ? ` aria-label="${escapeHtml(slide.meta.title)}"` : ""}${transition}${style}><div class="hono-decks-slide-content">${html}</div>${notesHtml}</section>`;
}

export async function renderCompiledSlideAsync(
  slide: CompiledSlide,
  assets: AssetRef[] = [],
  input: {
    components?: SlideComponentRegistry | Record<string, SlideComponentInput>;
    deck?: CompiledDeck;
    speakerNotes?: boolean;
    slideState?: "active" | "inactive";
  } = {},
): Promise<string> {
  const components = normalizeComponents(input.components);
  const slideState = input.slideState ?? "inactive";
  const layout = slide.meta.layout ?? "default";
  const classes = ["slide", `layout-${safeClass(layout)}`, slide.meta.className ? safeClass(slide.meta.className) : ""]
    .filter(Boolean)
    .join(" ");
  const notes = slide.notes ?? slide.meta.notes;
  const notesHtml =
    input.speakerNotes === false || !notes ? "" : `<aside class="speaker-notes" hidden>${escapeHtml(notes)}</aside>`;
  const html = await renderSlideBodyAsync(slide, assets, { ...input, components });
  const style = slideStyleAttribute(slide, assets);
  const transition = slide.meta.transition ? ` data-transition="${escapeHtml(safeClass(slide.meta.transition))}"` : "";

  return `<section class="${classes}" data-slide-index="${slide.index}" data-slide-state="${slideState}"${slide.meta.title ? ` aria-label="${escapeHtml(slide.meta.title)}"` : ""}${transition}${style}><div class="hono-decks-slide-content">${html}</div>${notesHtml}</section>`;
}

function slideStyleAttribute(slide: CompiledSlide, assets: AssetRef[]): string {
  const declarations: string[] = [];
  if (slide.meta.background) declarations.push(backgroundStyle(slide.meta.background, assets));
  if (slide.meta.transitionDuration) {
    declarations.push(`--hono-decks-slide-transition-duration:${slide.meta.transitionDuration}`);
  }
  if (slide.meta.transitionEasing) {
    declarations.push(`--hono-decks-slide-transition-easing:${slide.meta.transitionEasing}`);
  }
  return declarations.length ? ` style="${escapeHtml(declarations.join(";"))}"` : "";
}

function renderSlideBodySync(
  slide: CompiledSlide,
  assets: AssetRef[],
  input: { components?: SlideComponentRegistry; deck?: Pick<CompiledDeck, "sourcePath"> },
): string {
  try {
    if (slide.render) {
      const value = slide.render({
        components: createMdxComponents(input.components ?? builtInSlideComponents, { assets }),
      });
      if (value && typeof value === "object" && "then" in value && typeof value.then === "function") {
        // Observe rejections even though this API cannot await the result.
        void Promise.resolve(value).catch(() => undefined);
        throw new RenderError(
          "Async slide rendering requires renderCompiledSlideAsync() or renderCompiledDeckAsync().",
          "async-slide-render",
        );
      }
      return renderJsxValueSync(value as DeckRenderable);
    }
    if (slide.nodes?.length) return renderSlideNodes(slide.nodes, { components: input.components, assets });
    return rewriteLocalAssetUrls(requireSlideHtml(slide), assets);
  } catch (error) {
    if (error instanceof RenderError) throw error;
    throw new RenderError(
      `Render failed in ${input.deck?.sourcePath ?? "unknown deck"} slide ${slide.index + 1}: ${formatErrorMessage(error)}. Use the async rendering API for async JSX.`,
      "slide-render-error",
      error,
    );
  }
}

function requireSlideHtml(slide: CompiledSlide): string {
  if (typeof slide.html !== "string")
    throw new RenderError(
      "Slide has no renderable body. Import createDecks() from the generated module; compileDecks() returns build information only.",
      "slide-body-missing",
    );
  return slide.html;
}

async function renderSlideBodyAsync(
  slide: CompiledSlide,
  assets: AssetRef[],
  input: {
    components?: SlideComponentRegistry;
    deck?: Pick<CompiledDeck, "sourcePath">;
  },
): Promise<string> {
  try {
    return slide.render
      ? await renderJsxValue(
          slide.render({ components: createMdxComponents(input.components ?? builtInSlideComponents, { assets }) }),
        )
      : slide.nodes?.length
        ? await renderSlideNodesAsync(slide.nodes, { components: input.components, assets })
        : rewriteLocalAssetUrls(requireSlideHtml(slide), assets);
  } catch (error) {
    if (error instanceof RenderError) throw error;
    throw new RenderError(
      `Render failed in ${input.deck?.sourcePath ?? "unknown deck"} slide ${slide.index + 1}: ${formatErrorMessage(error)}`,
      "slide-render-error",
      error,
    );
  }
}

function normalizeComponents(
  components: SlideComponentRegistry | Record<string, SlideComponentInput> | undefined,
): SlideComponentRegistry | undefined {
  return {
    ...builtInSlideComponents,
    ...(components ? defineSlideComponents(components) : {}),
  };
}

function safeClass(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
