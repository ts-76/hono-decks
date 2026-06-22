import type { GeneratedModuleDeck } from "../mdx-module-generator";

export function emitModuleDecksRouter(input: { decks: GeneratedModuleDeck[] }): string {
  const slideImports = input.decks
    .flatMap((deck) =>
      deck.slideModules.map(
        (slide, index) => `import ${slideImportName(deck.deck.slug, index)} from ${JSON.stringify(slide.importPath)};`,
      ),
    )
    .join("\n");
  const componentImports = input.decks
    .filter((deck) => deck.componentModulePath)
    .map((deck) => `import * as ${componentImportName(deck.deck.slug)} from ${JSON.stringify(deck.componentModulePath)};`)
    .join("\n");

  return `// @ts-nocheck
import { defineDecks } from "@hono/decks";
import type { DecksRouterOverrides } from "@hono/decks";
import { decksClientEntry } from "./client-entry";
${slideImports}
${componentImports}

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

export const decks = defineDecks({
  clientEntryAsset: decksClientEntry,
  decks: [
${input.decks.map(emitDeckObject).join(",\n")}
  ]
});

export function decksRouter(options: DecksRouterOverrides = {}) {
  return decks.router(options);
}
`;
}

function emitDeckObject(deck: GeneratedModuleDeck): string {
  return `    {
      slug: ${JSON.stringify(deck.deck.slug)},
      sourcePath: ${JSON.stringify(deck.deck.sourcePath)},
      kind: ${JSON.stringify(deck.deck.kind)},
      meta: ${serializeValue(deck.deck.meta, 3)},
${deck.deck.themeStyle ? `      "themeStyle": ${serializeValue(deck.deck.themeStyle, 3)},\n` : ""}${deck.deck.themeSourcePath ? `      "themeSourcePath": ${JSON.stringify(deck.deck.themeSourcePath)},\n` : ""}
      assets: ${serializeValue(deck.deck.assets, 3)},
      componentRegistry: ${
        deck.componentModulePath
          ? `withClientComponentIds(${componentImportName(deck.deck.slug)}, ${serializeValue(deck.clientComponentIds ?? {}, 3)})`
          : "{}"
      },
      warnings: ${serializeValue(deck.deck.warnings, 3)},
      slides: [
${deck.deck.slides
  .map(
    (slide) => `        {
          index: ${slide.index},
          meta: ${serializeValue(slide.meta, 5)},
          html: "",
          components: [],
          notes: ${serializeValue(slide.notes, 5)},
          render: ${slideImportName(deck.deck.slug, slide.index)}
        }`,
  )
  .join(",\n")}
      ]
    }`;
}

function slideImportName(slug: string, index: number): string {
  return `Slide_${safeIdentifier(slug)}_${index}`;
}

function componentImportName(slug: string): string {
  return `Components_${safeIdentifier(slug)}`;
}

function safeIdentifier(value: string): string {
  return value.replace(/[^A-Za-z0-9_$]+/g, "_").replace(/^[^A-Za-z_$]+/, "_") || "_";
}

function serializeValue(value: unknown, depth: number): string {
  const indent = "  ".repeat(depth);
  const nextIndent = "  ".repeat(depth + 1);

  if (value === undefined) return "undefined";
  if (value instanceof Uint8Array) return `new Uint8Array([${[...value].join(", ")}])`;
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return `[\n${value.map((item) => `${nextIndent}${serializeValue(item, depth + 1)}`).join(",\n")}\n${indent}]`;
  }
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value).filter(([, item]) => item !== undefined);
    if (entries.length === 0) return "{}";
    return `{\n${entries
      .map(([key, item]) => `${nextIndent}${JSON.stringify(key)}: ${serializeValue(item, depth + 1)}`)
      .join(",\n")}\n${indent}}`;
  }
  return JSON.stringify(value);
}
