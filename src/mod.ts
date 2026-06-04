export { honoSlides, renderDeckPage } from "./middleware";
export type { HonoSlidesOptions } from "./middleware";
export { parseDeck } from "./parser";
export { renderDeck, renderSlide } from "./render";
export { compileMarkdown } from "./compiler";
export { buildDeckManifest, emitDeckManifestModule } from "./manifest-generator";
export type { BuildDeckManifestInput } from "./manifest-generator";
export { honoSlidesRouter } from "./router";
export type { HonoSlidesRouterOptions } from "./router";
export { manifestDeckSource } from "./manifest-source";
export { resolveDeckFiles } from "./file-routing";
export type { ResolvedDeckFile } from "./file-routing";
export { CompileError } from "./deck";
export type {
  AssetRef,
  CompileDeckInput,
  CompiledDeck,
  CompiledSlide,
  ComponentPlaceholder,
  CompileWarning,
  DeckCompiler,
  DeckEntry,
  DeckFrontmatter,
  DeckManifest,
  DeckSource,
  SlideFrontmatter,
} from "./deck";
export type { Slide, SlideBlock, SlideDeck } from "./types";
