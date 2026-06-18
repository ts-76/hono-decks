import type { CompiledDeck, DeckManifest } from "../deck/model";
import type { SlideNode } from "../shared/types";

export interface DeckComponentExport {
  slug: string;
  sourcePath: string;
  modulePath: string;
  exportName: string;
}

export interface ResolvedDeckComponentExport extends DeckComponentExport {
  internalName: string;
}

export interface ApplyDeckComponentRegistryInput {
  manifest: DeckManifest;
  components: DeckComponentExport[];
}

export interface ApplyDeckComponentRegistryResult {
  manifest: DeckManifest;
  components: ResolvedDeckComponentExport[];
}

export function applyDeckComponentRegistry(input: ApplyDeckComponentRegistryInput): ApplyDeckComponentRegistryResult {
  const components = input.components.map((component) => ({
    ...component,
    internalName: componentInternalName(component),
  }));
  const bySlugAndName = new Map(components.map((component) => [`${component.slug}:${component.exportName}`, component]));

  return {
    components,
    manifest: {
      decks: input.manifest.decks.map((deck) => rewriteDeckComponents(deck, bySlugAndName)),
    },
  };
}

export function emitDeckComponentRegistryModule(components: ResolvedDeckComponentExport[]): string {
  if (components.length === 0) {
    return `import { defineSlideComponents } from "hono-slides";\n\nexport const deckComponents = defineSlideComponents({});\n`;
  }

  return `import { defineSlideComponents } from "hono-slides";\n${components
    .map(
      (component) =>
        `import { ${component.exportName} as ${component.internalName} } from ${JSON.stringify(component.modulePath)};`,
    )
    .join("\n")}\n\nexport const deckComponents = defineSlideComponents({\n${components
    .map((component) => `  ${JSON.stringify(component.internalName)}: ${component.internalName}`)
    .join(",\n")}\n});\n`;
}

function rewriteDeckComponents(
  deck: CompiledDeck,
  components: Map<string, ResolvedDeckComponentExport>,
): CompiledDeck {
  return {
    ...deck,
    slides: deck.slides.map((slide) => ({
      ...slide,
      nodes: slide.nodes ? rewriteNodes(slide.nodes, deck.slug, components) : slide.nodes,
      components: slide.components.map((component) => {
        const resolved = components.get(`${deck.slug}:${component.name}`);
        return resolved ? { ...component, name: resolved.internalName } : component;
      }),
    })),
  };
}

function rewriteNodes(
  nodes: SlideNode[],
  slug: string,
  components: Map<string, ResolvedDeckComponentExport>,
): SlideNode[] {
  return nodes.map((node) => {
    if (node.type === "component") {
      const resolved = components.get(`${slug}:${node.name}`);
      return {
        ...node,
        name: resolved?.internalName ?? node.name,
        children: rewriteNodes(node.children, slug, components),
      };
    }
    if ("children" in node) return { ...node, children: rewriteNodes(node.children, slug, components) };
    return node;
  });
}

function componentInternalName(component: DeckComponentExport): string {
  return `${component.exportName}__${safeIdentifierPart(component.slug)}_${stableHash(
    `${component.slug}:${component.exportName}:${component.sourcePath}`,
  )}`;
}

function safeIdentifierPart(value: string): string {
  const safe = value.replace(/[^A-Za-z0-9_$]+/g, "_").replace(/^[^A-Za-z_$]+/, "_");
  return safe || "_";
}

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(6, "0").slice(0, 8);
}
