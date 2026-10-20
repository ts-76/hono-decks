import type { GeneratedModuleDeck } from "../mdx-module-generator";
import { DECKS_ADVANCED_ENTRY, DECKS_RUNTIME_ENTRY } from "../package-entry";

export function emitModuleDecksRouter(input: { decks: GeneratedModuleDeck[] }): string {
  const runtimeEntry = JSON.stringify(DECKS_RUNTIME_ENTRY);
  const advancedEntry = JSON.stringify(DECKS_ADVANCED_ENTRY);
  const slideImports = input.decks
    .flatMap((deck, deckIndex) =>
      deck.slideModules.map(
        (slide, index) => `import ${slideImportName(deckIndex, index)} from ${JSON.stringify(slide.importPath)};`,
      ),
    )
    .join("\n");
  const componentImports = input.decks
    .flatMap((deck, deckIndex) =>
      deck.componentModulePath
        ? [`import * as ${componentImportName(deckIndex)} from ${JSON.stringify(deck.componentModulePath)};`]
        : [],
    )
    .join("\n");

  return `// @ts-nocheck
import { configureDecks, defineDecks } from ${advancedEntry};
import type { ConfiguredDecks, DecksConfig } from ${runtimeEntry};
import type { Env } from "hono";
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

const generatedDecks = defineDecks({
  clientEntryAsset: decksClientEntry,
  decks: [
${input.decks.map((deck, deckIndex) => emitDeckObject(deck, deckIndex)).join(",\n")}
  ]
});

export function createDecks<E extends Env = any>(config: DecksConfig<E>): ConfiguredDecks<E> {
  return configureDecks(definedDecksFor<E>(), config);
}

function definedDecksFor<E extends Env>() {
  return generatedDecks;
}
`;
}

function emitDeckObject(deck: GeneratedModuleDeck, deckIndex: number): string {
  return `    {
      slug: ${JSON.stringify(deck.deck.slug)},
      sourcePath: ${JSON.stringify(deck.deck.sourcePath)},
      kind: ${JSON.stringify(deck.deck.kind)},
      meta: ${serializeValue(deck.deck.meta, 3)},
${typeof deck.deck.clientEntryRequired === "boolean" ? `      clientEntryRequired: ${deck.deck.clientEntryRequired},\n` : ""}
${deck.deck.themeStyle ? `      "themeStyle": ${serializeValue(deck.deck.themeStyle, 3)},\n` : ""}${deck.deck.themeSourcePath ? `      "themeSourcePath": ${JSON.stringify(deck.deck.themeSourcePath)},\n` : ""}
      assets: ${serializeValue(deck.deck.assets, 3)},
      componentRegistry: ${
        deck.componentModulePath
          ? `withClientComponentIds(${componentImportName(deckIndex)}, ${serializeValue(deck.clientComponentIds ?? {}, 3)})`
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
          render: ${slideImportName(deckIndex, slide.index)}
        }`,
  )
  .join(",\n")}
      ]
    }`;
}

function slideImportName(deckIndex: number, slideIndex: number): string {
  return `Slide_${deckIndex}_${slideIndex}`;
}

function componentImportName(deckIndex: number): string {
  return `Components_${deckIndex}`;
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
