/**
 * Worker-safe building blocks for custom sources, routers, and rendering
 * pipelines. Node-only build APIs live in `hono-decks/node`.
 */
export * from "./mod";
export { configureDecks, mergeDecksRouterOptions } from "./server/define-decks";
export type { GeneratedDecks } from "./server/define-decks";
export { inheritDeckDefaults, withClientComponentIds } from "./server/generated";
export { createDeckViewerParts, deckContext, decksRouter } from "./server/router";
export type { DeckContextOptions, DecksRouterOptions } from "./server/router";
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
export { renderDeckOverviewPageAsync } from "./renderer/overview-page";
export type { RenderDeckOverviewPageInput } from "./renderer/overview-page";
export { controlIconLabel, renderControlIcon, renderControlIconHtml } from "./renderer/control-icons";
