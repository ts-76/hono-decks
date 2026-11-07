/// <reference types="hono-decks/vite-env" />
import { createApp } from "honox/server";
import { withHonoXDecks } from "virtual:hono-decks/honox";
import deckRouter from "./deck-router";

export default createApp(
  withHonoXDecks(
    {
      init(app) {
        app.get("/robots.txt", (c) => c.text("User-agent: *\nAllow: /\n"));
      },
    },
    deckRouter,
  ),
);
