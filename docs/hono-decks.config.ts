import { defineDecksConfig } from "hono-decks";

export default defineDecksConfig({
  mountPath: "/demo",
  build: { root: "decks", outDir: "app/generated" },
  router: {
    embed: {
      document: { lang: "en" },
      robots: false,
    },
    pages: { index: false, viewer: true, print: false, presentation: false, presenter: false },
    viewer: { controls: { items: (controls) => [controls.fullscreen] } },
    presenter: false,
  },
});
