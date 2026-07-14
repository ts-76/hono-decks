import { createApp } from "honox/server";
import { decks } from "./generated/decks";

export default createApp({
  init(app) {
    app.route(
      "/demo",
      decks.router({
        embed: {
          document: { lang: "en" },
          robots: false,
          viewer: {
            controls: {
              items: (controls) => [controls.fullscreen],
            },
          },
        },
        pages: {
          index: false,
          viewer: false,
          print: false,
          presentation: false,
          presenter: false,
        },
        presenter: false,
      }),
    );
  },
});
