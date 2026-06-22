import type { DecksRouterOverrides } from "@hono/decks";
import { createSampleDeckSource } from "./deck-source";
import { decks } from "./generated/decks";

export const deckSource = createSampleDeckSource(decks.source);

export function createDecksRouter(options: DecksRouterOverrides = {}) {
  return decks.router({
    source: deckSource,
    ...options,
  });
}
