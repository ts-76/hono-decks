// App-owned facade. Files under src/generated are overwritten.
import config from "../hono-decks.config";
import { createDecks } from "./generated/decks";

export const decks = createDecks(config);
