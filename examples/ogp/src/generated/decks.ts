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
        "description": "Generate share images from deck metadata without launching a browser.",
        "author": "hono-decks"
      },

      assets: [],
      componentRegistry: {},
      warnings: [],
      slides: [
        {
          index: 0,
          meta: {
            "title": "Build-time Open Graph images",
            "layout": "cover",
            "meta": {}
          },
          html: "",
          components: [],
          notes: undefined,
          render: Slide_welcome_0
        },
        {
          index: 1,
          meta: {
            "title": "One source of truth",
            "layout": "default",
            "meta": {}
          },
          html: "",
          components: [],
          notes: undefined,
          render: Slide_welcome_1
        },
        {
          index: 2,
          meta: {
            "title": "Browserless output",
            "layout": "default",
            "meta": {}
          },
          html: "",
          components: [],
          notes: undefined,
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
