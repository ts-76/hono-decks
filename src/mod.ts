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
export { createDeckAgentInstanceName, createDeckMarkdownHash, parseDeckAgentMode } from "./agent/contract";
export type {
  DeckAgentChatResult,
  DeckAgentEditProposal,
  DeckAgentEditProposalBase,
  DeckAgentInstanceNameInput,
  DeckAgentMode,
  DeckAgentPatch,
  DeckAgentProposalValidation,
} from "./agent/contract";
export { applyDeckAgentProposal } from "./agent/apply";
export type { ApplyDeckAgentProposalResult } from "./agent/apply";
export { createCloudflareDeckAgentChat } from "./agent/cloudflare-chat";
export type { CreateCloudflareDeckAgentChatInput, RouteAgentRequest } from "./agent/cloudflare-chat";
export { createDeckCodeModeTool } from "./agent/codemode";
export type { CreateDeckCodeModeToolInput } from "./agent/codemode";
export { createDeckAgentToolProvider } from "./agent/tools";
export type { CompiledDeckSummary, CompiledSlideSummary, CreateDeckAgentToolProviderInput } from "./agent/tools";
export { honoSlidesRouter } from "./server/router";
export type { HonoSlidesAgentChatInput, HonoSlidesRouterOptions } from "./server/router";
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
