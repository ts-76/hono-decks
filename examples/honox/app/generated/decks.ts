// @ts-nocheck
import { configureDecks, defineDecks } from "hono-decks/advanced";
import type { ConfiguredDecks, DecksConfig } from "hono-decks";
import type { Env } from "hono";
import { decksClientEntry } from "./client-entry";
import Slide_honox_0 from "./decks/honox/slide-0";
import Slide_honox_1 from "./decks/honox/slide-1";
import Slide_honox_2 from "./decks/honox/slide-2";


function withClientComponentIds(module, clientIds) {
  const registry = {};
  for (const [name, value] of Object.entries(module)) {
    const clientId = clientIds[name];
    if (typeof value === "function") {
      registry[name] = clientId ? { component: value, clientId } : value;
      continue;
    }
    if (value && typeof value === "object" && "component" in value) {
      registry[name] = clientId ? { ...value, clientId } : value;
    }
  }
  return registry;
}

const generatedDecks = defineDecks({
  clientEntryAsset: decksClientEntry,
  decks: [
    {
      slug: "honox",
      sourcePath: "decks/honox/deck.mdx",
      kind: "directory",
      meta: {
        "meta": {},
        "title": "HonoX Deck",
        "description": "HonoXのポートフォリオに、登壇資料をそのまま組み込む",
        "author": "ts-76",
        "date": "2026-07-17",
        "transition": "slide-left",
        "transitionDuration": "360ms",
        "transitionEasing": "cubic-bezier(.22, 1, .36, 1)",
        "tags": [
          "honox",
          "portfolio",
          "talks"
        ]
      },
      "themeStyle": ":root {\n  --hono-decks-color: #fff8f3;\n  --hono-decks-muted-color: #d0c2b9;\n  --hono-decks-accent-color: #ff6b2c;\n  --hono-decks-border-color: rgba(255, 248, 243, 0.19);\n  --hono-decks-card-background: #1d1e23;\n  --hono-decks-inline-code-background: rgba(255, 107, 44, 0.14);\n  --hono-decks-code-background: #090a0c;\n  font-family: \"Avenir Next\", \"Hiragino Sans\", \"Yu Gothic\", ui-sans-serif, sans-serif;\n}\n\n.slide {\n  position: relative;\n  background: #111216;\n  color: #fff8f3;\n}\n\n.slide::before {\n  position: absolute;\n  inset: 0 0 auto;\n  height: 12px;\n  background: #ff6b2c;\n  content: \"\";\n}\n\n.slide .hono-decks-slide-content {\n  box-sizing: border-box;\n  padding: 2rem 2.5rem;\n}\n\n.honox-cover {\n  display: grid;\n  height: 100%;\n  grid-template-columns: minmax(0, 1fr) 11rem;\n  grid-template-rows: auto 1fr auto;\n  gap: 0.7rem 2rem;\n  align-items: end;\n}\n\n.honox-cover::after {\n  display: grid;\n  grid-column: 2;\n  grid-row: 1 / -1;\n  width: 10rem;\n  height: 10rem;\n  place-items: center;\n  align-self: center;\n  background: #ff6b2c;\n  color: #111216;\n  content: \"X\";\n  font-size: 6rem;\n  font-weight: 820;\n  letter-spacing: -0.08em;\n  transform: rotate(-4deg);\n}\n\n.honox-cover p,\n.honox-context {\n  margin: 0;\n  color: #ff9a6e;\n  font-size: 0.68rem;\n  font-weight: 740;\n}\n\n.honox-cover h1 {\n  margin: 0;\n  font-size: 4.2rem;\n  letter-spacing: -0.04em;\n  line-height: 0.91;\n}\n\n.honox-cover > span {\n  color: #d0c2b9;\n  font-size: 0.9rem;\n  line-height: 1.45;\n}\n\n.slide h2 {\n  max-width: 15ch;\n  margin: 0;\n  font-size: 3.15rem;\n  letter-spacing: -0.04em;\n  line-height: 0.95;\n}\n\n.honox-boundary {\n  display: grid;\n  grid-template-columns: repeat(3, minmax(0, 1fr));\n  gap: 0.7rem;\n  margin-top: 1.5rem;\n}\n\n.honox-boundary section {\n  display: flex;\n  min-height: 7.5rem;\n  flex-direction: column;\n  border-top: 3px solid #ff6b2c;\n  background: #1d1e23;\n  padding: 0.75rem;\n}\n\n.honox-boundary code {\n  align-self: flex-start;\n  color: #ff9a6e;\n  font-size: 0.58rem;\n}\n\n.honox-boundary strong {\n  margin-top: auto;\n  font-size: 0.92rem;\n}\n\n.honox-boundary span {\n  margin-top: 0.3rem;\n  color: #d0c2b9;\n  font-size: 0.62rem;\n  line-height: 1.4;\n}\n\n.layout-statement .hono-decks-slide-content {\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n}\n\n.layout-statement h2 {\n  margin-top: 0.7rem;\n  font-size: 4rem;\n}\n\n.honox-audiences {\n  display: flex;\n  gap: 0.4rem;\n  margin-top: 1.25rem;\n}\n\n.honox-audiences span {\n  border: 1px solid var(--hono-decks-border-color);\n  border-radius: 999px;\n  padding: 0.28rem 0.56rem;\n  color: #d0c2b9;\n  font-size: 0.65rem;\n}\n\n.honox-closing {\n  margin: 1rem 0 0;\n  color: #d0c2b9;\n  font-size: 0.78rem;\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .honox-cover::after {\n    transform: none;\n  }\n}\n",
      "themeSourcePath": "decks/honox/theme.css",

      assets: [],
      componentRegistry: {},
      warnings: [],
      slides: [
        {
          index: 0,
          meta: {
            "title": "HonoX + hono-decks",
            "layout": "cover",
            "notes": "HonoXの通常ページと登壇資料が、同じアプリ・同じデプロイ単位で動くことを伝える。",
            "transition": "slide-left",
            "transitionDuration": "360ms",
            "transitionEasing": "cubic-bezier(.22, 1, .36, 1)",
            "meta": {}
          },
          html: "",
          components: [],
          notes: "HonoXの通常ページと登壇資料が、同じアプリ・同じデプロイ単位で動くことを伝える。",
          render: Slide_honox_0
        },
        {
          index: 1,
          meta: {
            "title": "Integration boundary",
            "layout": "default",
            "notes": "file-based routingとgenerated routerの責務を3つのファイルで示す。",
            "transition": "slide-left",
            "transitionDuration": "360ms",
            "transitionEasing": "cubic-bezier(.22, 1, .36, 1)",
            "meta": {}
          },
          html: "",
          components: [],
          notes: "file-based routingとgenerated routerの責務を3つのファイルで示す。",
          render: Slide_honox_1
        },
        {
          index: 2,
          meta: {
            "title": "Publish the talk once",
            "layout": "statement",
            "notes": "ポートフォリオ、登壇画面、配布用PDFのために別々の成果物を管理する必要がない点を締めにする。",
            "transition": "slide-left",
            "transitionDuration": "360ms",
            "transitionEasing": "cubic-bezier(.22, 1, .36, 1)",
            "meta": {}
          },
          html: "",
          components: [],
          notes: "ポートフォリオ、登壇画面、配布用PDFのために別々の成果物を管理する必要がない点を締めにする。",
          render: Slide_honox_2
        }
      ]
    }
  ]
});

export function createDecks<E extends Env = any>(config: DecksConfig<E>): ConfiguredDecks<E> {
  return configureDecks(definedDecksFor<E>(), config);
}

function definedDecksFor<E extends Env>() {
  return generatedDecks;
}
