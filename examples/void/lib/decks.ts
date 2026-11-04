import { Hono } from "hono";
import config from "../hono-decks.config";
import { createDecks } from "./generated/decks";

export const decks = createDecks(config);
export const deckApp = new Hono().route(decks.mountPath, decks.router());
