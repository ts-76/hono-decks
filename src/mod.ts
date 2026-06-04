export { honoSlides, renderDeckPage } from "./middleware";
export type { HonoSlidesOptions } from "./middleware";
export { parseDeck } from "./parser";
export { renderDeck, renderSlide } from "./render";
export { compileMarkdown } from "./compiler";
export { createDevDeckRuntime } from "./dev-runtime";
export type { DevDeckRuntime, DevDeckRuntimeInput } from "./dev-runtime";
export { buildDeckManifest, emitDeckManifestModule } from "./manifest-generator";
export type { BuildDeckManifestInput } from "./manifest-generator";
export { createPreviewEventHub } from "./preview-events";
export type { PreviewEvent, PreviewEventHub, PreviewEventType } from "./preview-events";
export { createDeckAgentInstanceName, createDeckMarkdownHash, parseDeckAgentMode } from "./agent-contract";
export type {
  DeckAgentChatResult,
  DeckAgentEditProposal,
  DeckAgentEditProposalBase,
  DeckAgentInstanceNameInput,
  DeckAgentMode,
  DeckAgentPatch,
  DeckAgentProposalValidation,
} from "./agent-contract";
export { applyDeckAgentProposal } from "./agent-apply";
export type { ApplyDeckAgentProposalResult } from "./agent-apply";
export { createDeckAgentToolProvider } from "./agent-tools";
export type { CompiledDeckSummary, CompiledSlideSummary, CreateDeckAgentToolProviderInput } from "./agent-tools";
export { honoSlidesRouter } from "./router";
export type { HonoSlidesAgentChatInput, HonoSlidesRouterOptions } from "./router";
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
  DeckFileChange,
  DeckFileEntry,
  DeckFrontmatter,
  DeckManifest,
  DeckSource,
  LocalDeckIO,
  SlideFrontmatter,
} from "./deck";
export type { Slide, SlideBlock, SlideDeck } from "./types";
