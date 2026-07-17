// @ts-nocheck
import { configureDecks, defineDecks } from "hono-decks/advanced";
import type { ConfiguredDecks, DecksConfig } from "hono-decks";
import type { Env } from "hono";
import { decksClientEntry } from "./client-entry";
import Slide_product_0 from "./decks/product/slide-0";
import Slide_product_1 from "./decks/product/slide-1";
import Slide_product_2 from "./decks/product/slide-2";


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
      slug: "product",
      sourcePath: "decks/product/deck.mdx",
      kind: "directory",
      meta: {
        "meta": {},
        "title": "hono-decks overview",
        "description": "Compile MDX and serve the generated routes with Hono",
        "transition": "fade"
      },
      "themeStyle": ":root {\n  --hono-decks-color: #f7f7f8;\n  --hono-decks-muted-color: #b9bbc2;\n  --hono-decks-accent-color: #ff641f;\n  --hono-decks-border-color: rgba(255, 255, 255, 0.16);\n  --hono-decks-inline-code-background: rgba(255, 255, 255, 0.1);\n  --hono-decks-code-background: #090a0c;\n}\n\n.slide {\n  background: #111216;\n  color: var(--hono-decks-color);\n}\n\n.slide::before {\n  position: absolute;\n  inset: 0 0 auto;\n  height: 10px;\n  background: var(--hono-decks-accent-color);\n  content: \"\";\n}\n\n.slide .hono-decks-slide-content {\n  box-sizing: border-box;\n  padding: clamp(2rem, 5vw, 4.5rem);\n}\n\n.slide h1,\n.slide h2 {\n  max-width: 12ch;\n  margin: 0;\n  letter-spacing: -0.04em;\n  line-height: 0.98;\n  text-wrap: balance;\n}\n\n.slide h1 {\n  font-size: clamp(3rem, 7.5vw, 6rem);\n}\n\n.slide h2 {\n  font-size: clamp(2.4rem, 6vw, 4.8rem);\n}\n\n.slide p,\n.slide li {\n  color: var(--hono-decks-muted-color);\n  font-size: clamp(1.1rem, 2.25vw, 1.7rem);\n  line-height: 1.55;\n}\n\n.slide code {\n  color: var(--hono-decks-accent-color);\n}\n\n.slide ul {\n  display: grid;\n  gap: 0.7rem;\n  max-width: 28ch;\n  padding-left: 1.2em;\n}\n",
      "themeSourcePath": "decks/product/theme.css",

      assets: [],
      componentRegistry: {},
      warnings: [],
      slides: [
        {
          index: 0,
          meta: {
            "title": "MDX slides, served by Hono.",
            "layout": "cover",
            "transition": "fade",
            "meta": {}
          },
          html: "",
          components: [],
          notes: undefined,
          render: Slide_product_0
        },
        {
          index: 1,
          meta: {
            "title": "Routes included",
            "layout": "statement",
            "transition": "fade",
            "meta": {}
          },
          html: "",
          components: [],
          notes: undefined,
          render: Slide_product_1
        },
        {
          index: 2,
          meta: {
            "title": "Node.js stays in the build",
            "layout": "default",
            "transition": "fade",
            "meta": {}
          },
          html: "",
          components: [],
          notes: undefined,
          render: Slide_product_2
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
