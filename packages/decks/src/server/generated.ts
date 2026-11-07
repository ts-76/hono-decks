import type { CompiledDeck } from "../deck/model";
import type { SlideComponentInput } from "../renderer/compiled-render";

/** Attaches island client IDs to a deck's server component module exports. */
export function withClientComponentIds(
  module: Record<string, unknown>,
  clientIds: Record<string, string>,
): Record<string, SlideComponentInput> {
  const registry: Record<string, SlideComponentInput> = {};
  for (const [name, value] of Object.entries(module)) {
    const clientId = clientIds[name];
    if (typeof value === "function") {
      registry[name] = (clientId ? { component: value, clientId } : value) as SlideComponentInput;
      continue;
    }
    if (value && typeof value === "object" && "component" in value) {
      registry[name] = (clientId ? { ...value, clientId } : value) as SlideComponentInput;
    }
  }
  return registry;
}

/** Restores slide transition settings that the compiler omits when they equal the deck defaults. */
export function inheritDeckDefaults(deck: CompiledDeck): CompiledDeck {
  const { transition, transitionDuration, transitionEasing } = deck.meta;
  if (transition === undefined && transitionDuration === undefined && transitionEasing === undefined) return deck;
  return {
    ...deck,
    slides: deck.slides.map((slide) => ({
      ...slide,
      meta: {
        ...slide.meta,
        transition: slide.meta.transition ?? transition,
        transitionDuration: slide.meta.transitionDuration ?? transitionDuration,
        transitionEasing: slide.meta.transitionEasing ?? transitionEasing,
      },
    })),
  };
}
