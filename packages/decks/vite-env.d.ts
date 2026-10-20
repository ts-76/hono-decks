/** Types for the build-only Vite integration's virtual runtime entry. */
declare module "virtual:hono-decks" {
  export const decks: import("hono-decks").ConfiguredDecks;
  export function createDecks<E extends import("hono").Env = any>(
    config: import("hono-decks").DecksConfig<E>,
  ): import("hono-decks").ConfiguredDecks<E>;
}
