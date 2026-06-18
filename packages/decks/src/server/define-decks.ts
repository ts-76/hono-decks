import type { Hono } from "hono";
import type { CompiledDeck, DeckManifest, DeckSource } from "../deck/model";
import type { SlideComponentInput, SlideComponentRegistry } from "../renderer/compiled-render";
import { manifestDeckSource } from "../source/manifest-source";
import { decksRouter } from "./router";
import type { DecksRouterOptions } from "./router";

export type DecksOptions = Omit<DecksRouterOptions, "source"> &
  (
    | {
        manifest: DeckManifest;
        decks?: never;
      }
    | {
        decks: CompiledDeck[];
        manifest?: never;
      }
  );

export type DecksRouterOverrides = Partial<Omit<DecksRouterOptions, "components" | "clientEntryAsset">> & {
  components?: SlideComponentRegistry | Record<string, SlideComponentInput>;
};

export interface DefinedDecks {
  source: DeckSource;
  router(overrides?: DecksRouterOverrides): Hono;
}

export function defineDecks(options: DecksOptions): DefinedDecks {
  const manifest = Array.isArray(options.decks) ? { decks: options.decks } : options.manifest;
  if (!manifest) throw new Error("defineDecks requires either decks or manifest.");
  const source = manifestDeckSource(manifest);
  const baseOptions: DecksRouterOptions = {
    ...options,
    source,
  };

  return {
    source,
    router(overrides = {}) {
      const nextSource = overrides.source ?? source;
      return decksRouter({
        ...baseOptions,
        ...overrides,
        source: nextSource,
      });
    },
  };
}
