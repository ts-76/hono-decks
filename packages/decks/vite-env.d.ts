/** Types for the Vite plugin's virtual module, which re-exports the compiled decks module. */
declare module "virtual:hono-decks" {
  /** Mount path from hono-decks.config.ts. Asset URLs were compiled against it. */
  export const mountPath: string;
  export const compiledDecks: import("hono-decks").CompiledDeck[];
  /** Creates the application API: `app.route(decks.mountPath, decks.router())`. */
  export function createDecks<E extends import("hono").Env = any>(
    options?: import("hono-decks").DecksOptions<E>,
  ): import("hono-decks").ConfiguredDecks<E>;
}

/** HonoX integration: inserts the decks router into HonoX's file routes (requires honox). */
declare module "virtual:hono-decks/honox" {
  export function withHonoXDecks<E extends import("hono").Env = any>(
    options: import("honox/server").ServerOptions<E> | undefined,
    router: import("hono").Hono<any>,
  ): import("honox/server").ServerOptions<E>;
}
