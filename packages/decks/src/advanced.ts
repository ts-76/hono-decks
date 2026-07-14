/** Low-level building blocks for custom sources, routers, and rendering pipelines. */
export * from "./mod";
export { configureDecks, defineDecks, mergeDecksRouterOptions } from "./server/define-decks";
export type { DefinedDecks, DecksOptions, DecksRouterOverrides } from "./server/define-decks";
export { createDeckViewerParts, deckContext, decksRouter } from "./server/router";
export type { DeckContextOptions } from "./server/router";
export { serveDecksClientEntry } from "./server/client-entry";
export type { ServeDecksClientEntryOptions } from "./server/client-entry";
export { manifestDeckSource } from "./source/manifest-source";
export {
  builtInSlideComponents,
  renderCompiledDeck,
  renderCompiledDeckAsync,
  renderCompiledDeckPage,
  renderCompiledDeckPageAsync,
  renderCompiledSlide,
  renderCompiledSlideAsync,
} from "./renderer/compiled-render";
export { controlIconLabel, renderControlIcon, renderControlIconHtml } from "./renderer/control-icons";
