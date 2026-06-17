export { honoSlides, renderDeckPage } from "./server/middleware";
export type { HonoSlidesOptions } from "./server/middleware";
export { parseDeck } from "./deck/parser";
export { renderDeck, renderSlide } from "./deck/render";
export { compileMarkdown } from "./deck/compiler";
export { createDevDeckRuntime } from "./runtime/dev-runtime";
export type { DevDeckRuntime, DevDeckRuntimeInput } from "./runtime/dev-runtime";
export { buildDeckManifest, emitDeckManifestModule } from "./deck/manifest-generator";
export type { BuildDeckManifestInput } from "./deck/manifest-generator";
export { createPreviewEventHub } from "./runtime/preview-events";
export type { PreviewEvent, PreviewEventHub, PreviewEventType } from "./runtime/preview-events";
export { honoSlidesRouter } from "./server/router";
export type { HonoSlidesRouterExtension, HonoSlidesRouterOptions } from "./server/router";
export { manifestDeckSource } from "./deck/manifest-source";
export { resolveDeckFiles } from "./deck/file-routing";
export type { ResolvedDeckFile } from "./deck/file-routing";
export { CompileError } from "./deck/model";
export type {
  AssetRef,
  CompileDeckInput,
  CompiledDeck,
  CompiledSlide,
  ComponentPlaceholder,
  CompileWarning,
  DeckCompiler,
  DeckEntry,
  DeckFileChange,
  DeckFileEntry,
  DeckFrontmatter,
  DeckManifest,
  DeckSource,
  LocalDeckIO,
  SlideFrontmatter,
} from "./deck/model";
export type { Slide, SlideBlock, SlideDeck } from "./shared/types";
