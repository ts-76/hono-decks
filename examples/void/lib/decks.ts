/// <reference types="hono-decks/vite-env" />
import { Hono } from "hono";
import { createDecks } from "virtual:hono-decks";

export const decks = createDecks({
  embed: { frameAncestors: ["'self'", "https://hono-decks.com"], robots: false },
  pages: { index: false, viewer: true, print: false, presentation: false, presenter: false },
  presenter: false,
});
export const deckApp = new Hono().route(decks.mountPath, decks.router());
