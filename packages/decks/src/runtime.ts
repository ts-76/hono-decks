export { defineDecks, defineDecksConfig, mergeDecksRouterOptions } from "./server/define-decks";
export type {
  DecksConfig,
  DefinedDecks,
  DecksOptions,
  DecksRouterOverrides,
} from "./server/define-decks";
export { createDeckViewerEmbed, createDeckViewerParts, deckContext, decksRouter } from "./server/router";
export type {
  DeckBrowserRunBinding,
  DeckBrowserRunPdfOptions,
  DeckBrowserRunPngOptions,
  DeckContextOptions,
  DeckContextVariables,
  DeckDevResolver,
  DeckExportAuthorizeInput,
  DeckExportOptions,
  DeckPageMeta,
  DeckPresenterEnabledInput,
  DeckPresenterEnabledResolver,
  DeckPresenterViewerControlOptions,
  DeckTocItem,
  DeckViewerControlDefaults,
  DeckViewerControlItem,
  DeckViewerControlItemRenderer,
  DeckViewerControlKey,
  DeckViewerControlRenderInput,
  DeckViewerControlSlotItems,
  DeckViewerControlsContext,
  DeckViewerControlsItemsResolver,
  DeckViewerControlsOptions,
  DeckViewerEmbed,
  DeckViewerEmbedOptions,
  DeckViewerExportPaths,
  DeckViewerOptions,
  DeckViewerParts,
  DeckViewerRenderInput,
  DecksRouterExtension,
  DecksRouterOptions,
  DecksRouterPresenterOptions,
} from "./server/router";
export { serveDecksClientEntry } from "./server/client-entry";
export type { ServeDecksClientEntryOptions } from "./server/client-entry";
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
export type {
  AssetRef,
  CompiledDeck,
  DeckEntry,
  DeckManifest,
  DeckRequestContext,
  DeckSource,
} from "./deck/model";
export type {
  DeckRenderable,
  MaybePromise,
  SlideComponent,
  SlideComponentDefinition,
  SlideComponentInput,
  SlideComponentProps,
  SlideComponentRegistry,
} from "./renderer/compiled-render";
