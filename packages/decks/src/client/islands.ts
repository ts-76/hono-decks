import { render } from "hono/jsx/dom";
import { jsx } from "hono/jsx/dom/jsx-runtime";
import type { SlideComponent, SlideComponentProps } from "../renderer/jsx-renderer";
import type { SlidePropValue } from "../shared/types";

export type ClientSlideComponentRegistry = Record<string, SlideComponent>;

export interface HydrateSlideIslandsInput {
  root?: ParentNode;
  components: ClientSlideComponentRegistry;
}

export function hydrateSlideIslands(input: HydrateSlideIslandsInput): void {
  const root = input.root ?? document;
  const islands = root.querySelectorAll<HTMLElement>("[data-hono-decks-island]");

  for (const island of islands) {
    const name = island.dataset.honoDecksIsland;
    if (!name) continue;
    const component = input.components[name];
    if (!component) continue;

    const props: Record<string, SlidePropValue> = parseIslandProps(island.dataset.honoDecksProps);
    render(jsx(component, props satisfies SlideComponentProps), island);
  }
}

function parseIslandProps(value: string | undefined): Record<string, SlidePropValue> {
  if (!value) return {};
  const parsed = JSON.parse(value) as Record<string, unknown>;
  const props: Record<string, SlidePropValue> = {};

  for (const [key, prop] of Object.entries(parsed)) {
    if (typeof prop === "string" || typeof prop === "number" || typeof prop === "boolean") props[key] = prop;
  }

  return props;
}
