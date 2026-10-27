import { flushSync, render, useState } from "hono/jsx/dom";
import { jsx } from "hono/jsx/dom/jsx-runtime";
import type { SlideComponent, SlideComponentProps } from "../renderer/jsx-renderer";

export type ClientSlideComponentRegistry = Record<string, SlideComponent>;
type ClientIslandPropValue =
  | string
  | number
  | boolean
  | null
  | ClientIslandPropValue[]
  | { [key: string]: ClientIslandPropValue };

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

    const props: Record<string, ClientIslandPropValue> = parseIslandProps(island.dataset.honoDecksProps);
    const live = (window as Window & { __honoDecksLive?: {
      register(element: HTMLElement, update: (props: Record<string, ClientIslandPropValue>) => void, dispose: () => void): void;
    } }).__honoDecksLive;
    if (live) {
      if (island.dataset.honoDecksLiveMounted) continue;
      // The wrapper remains the same component across dev updates. Updating its
      // props lets Hono reconcile the existing child and retain its hook state.
      function LiveIsland() {
        const [currentProps, setCurrentProps] = useState(props);
        const [active, setActive] = useState(true);
        live!.register(island, setCurrentProps, () => flushSync(() => setActive(false)));
        return active ? jsx(component, currentProps satisfies SlideComponentProps) : null;
      }
      render(jsx(LiveIsland, {}), island);
      island.dataset.honoDecksLiveMounted = "true";
    } else {
      render(jsx(component, props satisfies SlideComponentProps), island);
    }
  }
}

function parseIslandProps(value: string | undefined): Record<string, ClientIslandPropValue> {
  if (!value) return {};
  return JSON.parse(value) as Record<string, ClientIslandPropValue>;
}
