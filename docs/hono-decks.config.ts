import { defineDecksConfig } from "hono-decks";

export default defineDecksConfig({
  mountPath: "/demo",
  build: { root: "decks", outDir: "app/generated" },
  router: {
    embed: {
      document: { lang: "en" },
      robots: false,
      viewer: { controls: { items: (controls) => [controls.fullscreen] } },
    },
    pages: { index: false, viewer: false, print: false, presentation: false, presenter: false },
    presenter: false,
  },
});
