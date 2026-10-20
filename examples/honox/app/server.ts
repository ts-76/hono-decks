import { createApp } from "honox/server";
import { withHonoXDecks } from "./honox-decks";

export default createApp(
  withHonoXDecks({
    init(app) {
      app.get("/robots.txt", (c) => c.text("User-agent: *\nAllow: /\n"));
    },
  }),
);
