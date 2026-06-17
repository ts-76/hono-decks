import type { DeckManifest } from "hono-slides";

export const deckManifest = {
  "decks": [
    {
      "slug": "sample",
      "sourcePath": "decks/sample/deck.mdx",
      "kind": "directory",
      "meta": {
        "meta": {},
        "title": "Hono Slides",
        "description": "Hono + Cloudflare Workers で動く MDX-like slide runtime"
      },
      "slides": [
        {
          "index": 0,
          "meta": {
            "title": "Hono Slides",
            "layout": "cover",
            "meta": {}
          },
          "html": "<h1>Hono Slides</h1>\n<p>Cloudflare Workers で動く Slidev-like deck</p>\n<section class=\"mdx-hero\" data-component=\"Hero\"><div class=\"mdx-hero-copy\"><h1>MDX-like components</h1></div></section>",
          "components": [
            {
              "id": "sample-0-0",
              "name": "Hero",
              "props": {
                "title": "MDX-like components"
              },
              "source": "<Hero title=\"MDX-like components\" />"
            }
          ]
        },
        {
          "index": 1,
          "meta": {
            "title": "Parse and View",
            "layout": "cover",
            "meta": {}
          },
          "html": "<h2>Parse and View</h2>\n<ul><li>Markdown/MDX-like source を compile</li><li>deck manifest と slide metadata を保持</li><li>Hono route で viewer/render page を配信</li></ul>",
          "components": []
        },
        {
          "index": 2,
          "meta": {
            "title": "次にやること",
            "layout": "statement",
            "meta": {}
          },
          "html": "<h2>次にやること</h2>\n<blockquote>自分の deck source や asset pipeline を接続する</blockquote>",
          "components": []
        }
      ],
      "assets": [],
      "warnings": []
    }
  ]
} satisfies DeckManifest;

export const manifest = deckManifest;
