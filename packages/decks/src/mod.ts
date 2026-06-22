export { deckMiddleware, renderDeckPage } from "./server/middleware";
export type { DeckMiddlewareOptions } from "./server/middleware";
export { parseDeck } from "./parser/parser";
export { renderDeck, renderSlide } from "./renderer/render";
export {
  builtInSlideComponents,
  defineDeckTheme,
  defineDeckThemes,
  defineSlideComponents,
  renderCompiledDeck,
  renderCompiledDeckAsync,
  renderCompiledDeckPage,
  renderCompiledDeckPageAsync,
  renderCompiledSlide,
  renderCompiledSlideAsync,
} from "./renderer/compiled-render";
export type {
  DeckRenderable,
  DeckTheme,
  DeckThemeRegistry,
  MaybePromise,
  SlideLayout,
  SlideLayoutInput,
  SlideComponent,
  SlideComponentDefinition,
  SlideComponentInput,
  SlideComponentProps,
  SlideComponentRegistry,
} from "./renderer/compiled-render";
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
export { serveDecksClientEntry } from "./server/client-entry";
export type { ServeDecksClientEntryOptions } from "./server/client-entry";
export { defineDecks } from "./server/define-decks";
export type { DefinedDecks, DecksOptions, DecksRouterOverrides } from "./server/define-decks";
export { createDeckViewerParts, deckContext, decksRouter } from "./server/router";
export type {
  DeckBrowserRunBinding,
  DeckBrowserRunPdfOptions,
  DeckBrowserRunPngOptions,
  DeckContextOptions,
  DeckContextVariables,
  DeckExportOptions,
  DeckPageMeta,
  DeckTocItem,
  DeckViewerOptions,
  DeckViewerParts,
  DeckViewerRenderInput,
  DecksRouterExtension,
  DecksRouterOptions,
} from "./server/router";
export { manifestDeckSource } from "./source/manifest-source";
export { withR2Assets } from "./source/r2-assets";
export type {
  R2AssetKeyInput,
  R2AssetSourceOptions,
  R2BucketLike,
  R2BucketResolver,
  R2ObjectBodyLike,
  R2ObjectHttpMetadataLike,
} from "./source/r2-assets";
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
  DeckSource,
  LocalDeckIO,
  SlideFrontmatter,
} from "./deck/model";
export type { Slide, SlideBlock, SlideDeck, SlideNode, SlidePropValue } from "./shared/types";
