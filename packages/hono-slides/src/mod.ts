export { honoSlides, renderDeckPage } from "./server/middleware";
export type { HonoSlidesOptions } from "./server/middleware";
export { parseDeck } from "./parser/parser";
export { renderDeck, renderSlide } from "./renderer/render";
export { compileMarkdown } from "./compiler/compiler";
export { createDevDeckRuntime } from "./runtime/dev-runtime";
export type { DevDeckRuntime, DevDeckRuntimeInput } from "./runtime/dev-runtime";
export { buildDeckManifest, emitDeckManifestModule } from "./generator/manifest-generator";
export type { BuildDeckManifestInput } from "./generator/manifest-generator";
export { createPreviewEventHub } from "./runtime/preview-events";
export type { PreviewEvent, PreviewEventHub, PreviewEventType } from "./runtime/preview-events";
export { honoSlidesRouter } from "./server/router";
export type { HonoSlidesRouterExtension, HonoSlidesRouterOptions } from "./server/router";
export { manifestDeckSource } from "./source/manifest-source";
export { resolveDeckFiles } from "./routing/file-routing";
export type { ResolvedDeckFile } from "./routing/file-routing";
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
