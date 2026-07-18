import { defineDecksConfig } from "hono-decks";

export default defineDecksConfig({
  mountPath: "/demo",
  build: { root: "decks", outDir: "app/generated" },
  router: {
    embed: {
      document: { lang: "en" },
      robots: false,
      viewer: {
        controls: {
          items: (_controls, context) => [
            {
              type: "link",
              key: "open-viewer",
              href: context.meta.paths.viewer,
              label: "Open full viewer",
              icon: "fullscreen",
              attributes: {
                "aria-label": "Open full viewer",
                "data-hono-decks-viewer-link": true,
                target: "_blank",
                rel: "noreferrer",
              },
            },
          ],
        },
      },
    },
    pages: { index: false, viewer: true, print: false, presentation: false, presenter: false },
    viewer: { controls: { items: (controls) => [controls.fullscreen] } },
    presenter: false,
  },
});
