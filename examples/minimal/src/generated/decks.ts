// @ts-nocheck
import { configureDecks, defineDecks } from "hono-decks/advanced";
import type { ConfiguredDecks, DecksConfig } from "hono-decks";
import type { Env } from "hono";
import { decksClientEntry } from "./client-entry";
import Slide_welcome_0 from "./decks/welcome/slide-0";
import Slide_welcome_1 from "./decks/welcome/slide-1";


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
        "title": "Minimal Hono Deck",
        "description": "The smallest production-shaped hono-decks Worker example",
        "author": "ts-76",
        "date": "2026-07-17",
        "transition": "fade",
        "transitionDuration": "260ms",
        "transitionEasing": "cubic-bezier(.22, 1, .36, 1)",
        "tags": [
          "hono",
          "minimal",
          "worker"
        ]
      },
      "themeStyle": ":root {\n  color-scheme: light;\n  --hono-decks-color: #151515;\n  --hono-decks-muted-color: #55514d;\n  --hono-decks-accent-color: #f05a24;\n  --hono-decks-border-color: rgba(21, 21, 21, 0.2);\n  --hono-decks-card-background: #f0efed;\n  --hono-decks-inline-code-background: rgba(240, 90, 36, 0.12);\n  --hono-decks-code-background: #151515;\n  font-family: \"Avenir Next\", \"Segoe UI\", ui-sans-serif, sans-serif;\n}\n\n.slide {\n  position: relative;\n  background: #fbfbfa;\n  color: #151515;\n}\n\n.slide::before {\n  position: absolute;\n  inset: 0 0 auto;\n  height: 14px;\n  background: #f05a24;\n  content: \"\";\n}\n\n.slide .hono-decks-slide-content {\n  box-sizing: border-box;\n  padding: 2.2rem 2.6rem;\n}\n\n.minimal-cover {\n  display: grid;\n  height: 100%;\n  grid-template-columns: minmax(0, 1fr) minmax(12rem, 0.46fr);\n  grid-template-rows: auto 1fr auto;\n  gap: 0.6rem 2rem;\n  align-items: end;\n}\n\n.minimal-index {\n  grid-column: 1 / -1;\n  align-self: start;\n  color: #f05a24;\n  font-size: 0.68rem;\n  font-weight: 760;\n}\n\n.minimal-cover h1 {\n  grid-row: 2;\n  margin: 0;\n  font-size: 4.6rem;\n  letter-spacing: -0.04em;\n  line-height: 0.88;\n}\n\n.minimal-cover p {\n  grid-row: 2;\n  margin: 0;\n  color: #55514d;\n  font-size: 1.1rem;\n  line-height: 1.45;\n}\n\n.slide .minimal-cover code {\n  grid-column: 1 / -1;\n  justify-self: stretch;\n  border-radius: 8px;\n  background: #151515;\n  padding: 0.7rem 0.9rem;\n  color: #fbfbfa;\n  font-size: 0.72rem;\n}\n\n.slide h2 {\n  max-width: 13ch;\n  margin: 0;\n  font-size: 3.25rem;\n  letter-spacing: -0.04em;\n  line-height: 0.94;\n}\n\n.minimal-stack {\n  display: grid;\n  grid-template-columns: repeat(3, minmax(0, 1fr));\n  margin-top: 1.5rem;\n  border-top: 1px solid var(--hono-decks-border-color);\n  border-bottom: 1px solid var(--hono-decks-border-color);\n}\n\n.minimal-stack section {\n  display: grid;\n  min-height: 5rem;\n  align-content: space-between;\n  border-right: 1px solid var(--hono-decks-border-color);\n  padding: 0.75rem;\n}\n\n.minimal-stack section:last-child {\n  border-right: 0;\n}\n\n.minimal-stack strong {\n  font-size: 0.78rem;\n}\n\n.minimal-stack span {\n  color: #f05a24;\n  font-size: 0.62rem;\n  font-weight: 720;\n}\n\n.minimal-result {\n  margin: 1rem 0 0;\n  color: #55514d;\n  font-size: 0.72rem;\n}\n",
      "themeSourcePath": "decks/welcome/theme.css",

      assets: [],
      componentRegistry: {},
      warnings: [],
      slides: [
        {
          index: 0,
          meta: {
            "title": "Minimal Hono Deck",
            "layout": "cover",
            "notes": "hono-decksの最小構成は、deck source、生成facade、mountの3点だけで成立する。",
            "transition": "fade",
            "transitionDuration": "260ms",
            "transitionEasing": "cubic-bezier(.22, 1, .36, 1)",
            "meta": {}
          },
          html: "",
          components: [],
          notes: "hono-decksの最小構成は、deck source、生成facade、mountの3点だけで成立する。",
          render: Slide_welcome_0
        },
        {
          index: 1,
          meta: {
            "title": "What is included",
            "layout": "default",
            "notes": "小ささは機能不足ではなく、build/runtime境界が整理されている結果だと伝える。",
            "transition": "fade",
            "transitionDuration": "260ms",
            "transitionEasing": "cubic-bezier(.22, 1, .36, 1)",
            "meta": {}
          },
          html: "",
          components: [],
          notes: "小ささは機能不足ではなく、build/runtime境界が整理されている結果だと伝える。",
          render: Slide_welcome_1
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
