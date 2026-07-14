import { createApp } from "honox/server";
import { decks } from "./decks";

export default createApp({
  init(app) {
    app.route(decks.mountPath, decks.router());
  },
});
