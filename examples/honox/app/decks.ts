/// <reference types="hono-decks/vite-env" />
import { createDecks } from "virtual:hono-decks";

export const decks = createDecks({
  embed: {
    frameAncestors: ["https://hono-decks.com"],
    viewer: { controls: { hidden: ["exportPdf", "exportPng"] } },
  },
  presenter: {
    enabled: ({ dev }) => dev,
    viewerControl: true,
  },
});
