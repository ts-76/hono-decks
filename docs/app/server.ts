import { createApp } from "honox/server";
import { decks } from "./decks";

const robotsText = "User-agent: *\nAllow: /\n";

export default createApp({
  init(app) {
    app.get("/robots.txt", (c) => c.text(robotsText));
    app.route(decks.mountPath, decks.router());
  },
});
