// @ts-nocheck
import { defineDecks } from "@hono/decks";
import type { DecksRouterOverrides } from "@hono/decks";
import Slide_sample_0 from "./decks/sample/slide-0";
import Slide_sample_1 from "./decks/sample/slide-1";
import Slide_sample_2 from "./decks/sample/slide-2";
import * as Components_sample from "../../decks/sample/components";

export const decks = defineDecks({
  decks: [
    {
      slug: "sample",
      sourcePath: "decks/sample/deck.mdx",
      kind: "directory",
      meta: {
        "title": "Hono Slides",
        "description": "Hono + Cloudflare Workers で動く MDX-like slide runtime",
        "meta": {}
      },
      assets: [],
      componentRegistry: Components_sample,
      warnings: [],
      slides: [
        {
          index: 0,
          meta: {
            "title": "Hono Slides",
            "layout": "cover",
            "meta": {}
          },
          html: "",
          components: [],
          notes: undefined,
          render: Slide_sample_0
        },
        {
          index: 1,
          meta: {
            "title": "Parse and View",
            "meta": {}
          },
          html: "",
          components: [],
          notes: undefined,
          render: Slide_sample_1
        },
        {
          index: 2,
          meta: {
            "layout": "statement",
            "meta": {}
          },
          html: "",
          components: [],
          notes: undefined,
          render: Slide_sample_2
        }
      ]
    }
  ]
});

export function decksRouter(options: DecksRouterOverrides = {}) {
  return decks.router(options);
}
