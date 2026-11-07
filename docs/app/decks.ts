/// <reference types="hono-decks/vite-env" />
import { createDecks } from "virtual:hono-decks";

export const decks = createDecks({
  embed: {
    document: { lang: "en" },
    robots: false,
  },
  pages: { index: false, viewer: true, print: false, presentation: false, presenter: false },
  viewer: { controls: { items: (controls) => [controls.fullscreen] } },
  presenter: false,
});
