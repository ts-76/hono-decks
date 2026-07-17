// @ts-nocheck
import { configureDecks, defineDecks } from "hono-decks/advanced";
import type { ConfiguredDecks, DecksConfig } from "hono-decks";
import type { Env } from "hono";
import { decksClientEntry } from "./client-entry";
import Slide_welcome_0 from "./decks/welcome/slide-0";
import Slide_welcome_1 from "./decks/welcome/slide-1";
import Slide_welcome_2 from "./decks/welcome/slide-2";


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
      slug: "welcome",
      sourcePath: "decks/welcome/deck.mdx",
      kind: "directory",
      meta: {
        "meta": {},
        "title": "Build-time Open Graph images",
        "description": "Generate deterministic social images from deck metadata without launching a browser.",
        "author": "hono-decks",
        "date": "2026-07-17",
        "transition": "slide-up",
        "transitionDuration": "320ms",
        "transitionEasing": "cubic-bezier(.22, 1, .36, 1)",
        "tags": [
          "ogp",
          "satori",
          "resvg"
        ]
      },
      "themeStyle": ":root {\n  --hono-decks-color: #f8f8f5;\n  --hono-decks-muted-color: #c7c8c2;\n  --hono-decks-accent-color: #ff6b35;\n  --hono-decks-border-color: rgba(248, 248, 245, 0.18);\n  --hono-decks-card-background: #202126;\n  --hono-decks-inline-code-background: rgba(255, 107, 53, 0.14);\n  --hono-decks-code-background: #090a0c;\n  font-family: \"Atkinson Hyperlegible\", \"Avenir Next\", \"Segoe UI\", ui-sans-serif, sans-serif;\n}\n\n.slide {\n  position: relative;\n  background: #111216;\n  color: #f8f8f5;\n}\n\n.slide::before {\n  position: absolute;\n  inset: 0 0 auto;\n  height: 12px;\n  background: #ff6b35;\n  content: \"\";\n}\n\n.slide .hono-decks-slide-content {\n  box-sizing: border-box;\n  padding: 2rem 2.5rem;\n}\n\n.ogp-cover {\n  display: grid;\n  height: 100%;\n  align-content: space-between;\n}\n\n.ogp-cover > p,\n.ogp-context {\n  margin: 0;\n  color: #ff9a73;\n  font-size: 0.68rem;\n  font-weight: 740;\n}\n\n.ogp-cover h1 {\n  max-width: 13ch;\n  margin: 0;\n  font-size: 4.2rem;\n  letter-spacing: -0.04em;\n  line-height: 0.92;\n}\n\n.ogp-cover > div {\n  display: flex;\n  gap: 0.5rem;\n  align-items: center;\n  color: #c7c8c2;\n  font-size: 0.75rem;\n}\n\n.slide h2 {\n  max-width: 13ch;\n  margin: 0;\n  font-size: 3.2rem;\n  letter-spacing: -0.04em;\n  line-height: 0.95;\n}\n\n.ogp-flow {\n  display: grid;\n  grid-template-columns: 1fr auto 1fr auto 1fr;\n  gap: 0.6rem;\n  align-items: center;\n  margin-top: 1.7rem;\n}\n\n.ogp-flow section {\n  display: grid;\n  min-height: 7.8rem;\n  align-content: space-between;\n  border-top: 3px solid #ff6b35;\n  background: #202126;\n  padding: 0.8rem;\n}\n\n.ogp-flow section.is-accent {\n  background: #ff6b35;\n  color: #111216;\n}\n\n.ogp-flow > span {\n  color: #ff9a73;\n  font-size: 1.3rem;\n}\n\n.ogp-flow code {\n  justify-self: start;\n  color: #ff9a73;\n  font-size: 0.6rem;\n}\n\n.ogp-flow .is-accent code {\n  background: rgba(17, 18, 22, 0.14);\n  color: #111216;\n}\n\n.ogp-flow strong {\n  font-size: 0.9rem;\n  line-height: 1.45;\n}\n\n.layout-statement .hono-decks-slide-content {\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n}\n\n.layout-statement h2 {\n  max-width: 15ch;\n  margin-top: 0.75rem;\n  font-size: 3.8rem;\n}\n\n.ogp-proof {\n  display: flex;\n  gap: 0.45rem;\n  margin-top: 1.2rem;\n}\n\n.ogp-proof span {\n  border: 1px solid var(--hono-decks-border-color);\n  border-radius: 999px;\n  padding: 0.3rem 0.6rem;\n  color: #c7c8c2;\n  font-size: 0.66rem;\n}\n",
      "themeSourcePath": "decks/welcome/theme.css",

      assets: [],
      componentRegistry: {},
      warnings: [],
      slides: [
        {
          index: 0,
          meta: {
            "title": "Build-time Open Graph images",
            "layout": "cover",
            "notes": "browserを起動せず、デッキのmetadataから共有画像を生成できることを提示する。",
            "transition": "slide-up",
            "transitionDuration": "320ms",
            "transitionEasing": "cubic-bezier(.22, 1, .36, 1)",
            "meta": {}
          },
          html: "",
          components: [],
          notes: "browserを起動せず、デッキのmetadataから共有画像を生成できることを提示する。",
          render: Slide_welcome_0
        },
        {
          index: 1,
          meta: {
            "title": "One source of truth",
            "layout": "default",
            "notes": "viewer metadataと画像の文字情報が同じfrontmatterを参照するため、共有時の不整合が起きない。",
            "transition": "slide-up",
            "transitionDuration": "320ms",
            "transitionEasing": "cubic-bezier(.22, 1, .36, 1)",
            "meta": {}
          },
          html: "",
          components: [],
          notes: "viewer metadataと画像の文字情報が同じfrontmatterを参照するため、共有時の不整合が起きない。",
          render: Slide_welcome_1
        },
        {
          index: 2,
          meta: {
            "title": "Browserless output",
            "layout": "statement",
            "notes": "出力はStatic Assetsへ保存し、Worker runtimeには画像rendererを持ち込まない。",
            "transition": "slide-up",
            "transitionDuration": "320ms",
            "transitionEasing": "cubic-bezier(.22, 1, .36, 1)",
            "meta": {}
          },
          html: "",
          components: [],
          notes: "出力はStatic Assetsへ保存し、Worker runtimeには画像rendererを持ち込まない。",
          render: Slide_welcome_2
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
