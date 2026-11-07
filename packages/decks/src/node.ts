/** Node-only build APIs: compiler, file-system adapters, and config loading. Never import from a Worker. */
export * from "./node/index";
export { parseDeck } from "./parser/parser";
export { compileMarkdown } from "./compiler/compiler";
export { buildDeckManifest, emitDeckManifestModule } from "./generator/manifest-generator";
export type { BuildDeckManifestInput } from "./generator/manifest-generator";
export { applyDeckComponentRegistry, emitDeckComponentRegistryModule } from "./generator/component-registry";
export type {
  ApplyDeckComponentRegistryInput,
  ApplyDeckComponentRegistryResult,
  DeckComponentExport,
  ResolvedDeckComponentExport,
} from "./generator/component-registry";
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
