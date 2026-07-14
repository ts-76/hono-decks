export * from "./node/index";
export { deckMiddleware, renderDeckPage } from "./server/middleware";
export type { DeckMiddlewareOptions } from "./server/middleware";
export { parseDeck } from "./parser/parser";
export { renderDeck, renderSlide } from "./renderer/render";
export { compileMarkdown } from "./compiler/compiler";
export { createDevDeckRuntime } from "./runtime/dev-runtime";
export type { DevDeckRuntime, DevDeckRuntimeInput } from "./runtime/dev-runtime";
export { buildDeckManifest, emitDeckManifestModule } from "./generator/manifest-generator";
export type { BuildDeckManifestInput } from "./generator/manifest-generator";
export { applyDeckComponentRegistry, emitDeckComponentRegistryModule } from "./generator/component-registry";
export type {
  ApplyDeckComponentRegistryInput,
  ApplyDeckComponentRegistryResult,
  DeckComponentExport,
  ResolvedDeckComponentExport,
} from "./generator/component-registry";
export { createPreviewEventHub } from "./runtime/preview-events";
export type { PreviewEvent, PreviewEventHub, PreviewEventType } from "./runtime/preview-events";
export { resolveDeckFiles } from "./routing/file-routing";
export type { ResolvedDeckFile } from "./routing/file-routing";
export { CompileError, RenderError } from "./deck/model";
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
  DeckRequestContext,
  DeckSource,
  LocalDeckIO,
  SlideFrontmatter,
} from "./deck/model";
export type { Slide, SlideBlock, SlideDeck, SlideNode, SlidePropValue } from "./shared/types";
