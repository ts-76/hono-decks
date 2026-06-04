export { honoSlides, renderDeckPage } from "./middleware";
export type { HonoSlidesOptions } from "./middleware";
export { parseDeck } from "./parser";
export { renderDeck, renderSlide } from "./render";
export { honoSlidesRouter } from "./router";
export type { HonoSlidesRouterOptions } from "./router";
export { manifestDeckSource } from "./manifest-source";
export { resolveDeckFiles } from "./file-routing";
export type { ResolvedDeckFile } from "./file-routing";
export type {
  AssetRef,
  CompiledDeck,
  CompiledSlide,
  ComponentPlaceholder,
  CompileWarning,
  DeckEntry,
  DeckFrontmatter,
  DeckManifest,
  DeckSource,
  SlideFrontmatter,
} from "./deck";
export type { Slide, SlideBlock, SlideDeck } from "./types";
