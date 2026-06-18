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
          "html": "<h1>Hono Slides</h1>\n<p>Cloudflare Workers で動く Slidev-like deck</p>\n<section class=\"mdx-hero\" data-component=\"Hero\"><div class=\"mdx-hero-copy\"><h1>MDX-like components</h1></div></section>\n<div class=\"mdx-component\" data-component=\"Badge\"><strong>&lt;Badge /&gt;</strong><dl><div><dt>label</dt><dd>Rendered by a Hono JSX component</dd></div></dl></div>",
          "nodes": [
            {
              "type": "element",
              "tag": "h1",
              "props": {},
              "children": [
                {
                  "type": "text",
                  "value": "Hono Slides"
                }
              ]
            },
            {
              "type": "element",
              "tag": "p",
              "props": {},
              "children": [
                {
                  "type": "text",
                  "value": "Cloudflare Workers で動く Slidev-like deck"
                }
              ]
            },
            {
              "type": "component",
              "name": "Hero",
              "props": {
                "title": "MDX-like components"
              },
              "children": []
            },
            {
              "type": "component",
              "name": "Badge",
              "props": {
                "label": "Rendered by a Hono JSX component"
              },
              "children": []
            }
          ],
          "components": [
            {
              "id": "sample-0-0",
              "name": "Hero",
              "props": {
                "title": "MDX-like components"
              },
              "source": "<Hero title=\"MDX-like components\" />"
            },
            {
              "id": "sample-0-1",
              "name": "Badge",
              "props": {
                "label": "Rendered by a Hono JSX component"
              },
              "source": "<Badge label=\"Rendered by a Hono JSX component\" />"
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
          "nodes": [
            {
              "type": "element",
              "tag": "h2",
              "props": {},
              "children": [
                {
                  "type": "text",
                  "value": "Parse and View"
                }
              ]
            },
            {
              "type": "element",
              "tag": "ul",
              "props": {},
              "children": [
                {
                  "type": "element",
                  "tag": "li",
                  "props": {},
                  "children": [
                    {
                      "type": "element",
                      "tag": "p",
                      "props": {},
                      "children": [
                        {
                          "type": "text",
                          "value": "Markdown/MDX-like source を compile"
                        }
                      ]
                    }
                  ]
                },
                {
                  "type": "element",
                  "tag": "li",
                  "props": {},
                  "children": [
                    {
                      "type": "element",
                      "tag": "p",
                      "props": {},
                      "children": [
                        {
                          "type": "text",
                          "value": "deck manifest と slide metadata を保持"
                        }
                      ]
                    }
                  ]
                },
                {
                  "type": "element",
                  "tag": "li",
                  "props": {},
                  "children": [
                    {
                      "type": "element",
                      "tag": "p",
                      "props": {},
                      "children": [
                        {
                          "type": "text",
                          "value": "Hono route で viewer/render page を配信"
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ],
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
          "nodes": [
            {
              "type": "element",
              "tag": "h2",
              "props": {},
              "children": [
                {
                  "type": "text",
                  "value": "次にやること"
                }
              ]
            },
            {
              "type": "element",
              "tag": "blockquote",
              "props": {},
              "children": [
                {
                  "type": "element",
                  "tag": "p",
                  "props": {},
                  "children": [
                    {
                      "type": "text",
                      "value": "自分の deck source や asset pipeline を接続する"
                    }
                  ]
                }
              ]
            }
          ],
          "components": []
        }
      ],
      "assets": [],
      "warnings": []
    }
  ]
} satisfies DeckManifest;

export const manifest = deckManifest;
