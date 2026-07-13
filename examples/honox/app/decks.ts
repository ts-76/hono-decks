// App-owned facade. Files under app/generated are overwritten by decks:compile.
import { decks } from "./generated/decks";

export const deckSource = decks.source;

export function createDecksRouter() {
  return decks.router();
}
