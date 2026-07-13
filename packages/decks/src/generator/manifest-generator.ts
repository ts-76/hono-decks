import { compileMarkdown } from "../compiler/compiler";
import type { DeckManifest } from "../deck/model";
import { resolveDeckFiles } from "../routing/file-routing";
import { buildAssetRefs } from "./assets";
import { DECKS_RUNTIME_ENTRY } from "./package-entry";

export interface BuildDeckManifestInput {
  root: string;
  paths: string[];
  mountPath?: string;
  readText(path: string): Promise<string>;
  readBinary?(path: string): Promise<Uint8Array>;
}

export async function buildDeckManifest(input: BuildDeckManifestInput): Promise<DeckManifest> {
  const resolved = resolveDeckFiles(input.paths, input.root);
  const decks = await Promise.all(
    resolved.map(async (entry) => {
      const markdown = await input.readText(entry.sourcePath);
      const deck = await compileMarkdown({
        slug: entry.slug,
        sourcePath: entry.sourcePath,
        kind: entry.kind,
        markdown,
      });
      return {
        ...deck,
        assets: [...(await buildAssetRefs(entry.slug, entry.assetPaths, input)), ...deck.assets],
      };
    }),
  );

  return { decks };
}

export function emitDeckManifestModule(manifest: DeckManifest): string {
  const serializable = { decks: manifest.decks };

  return `import type { DeckManifest } from ${JSON.stringify(DECKS_RUNTIME_ENTRY)};\n\nexport const deckManifest = ${serializeManifestValue(
    serializable,
    0,
  )} satisfies DeckManifest;\n\nexport const manifest = deckManifest;\n`;
}

function serializeManifestValue(value: unknown, depth: number): string {
  const indent = "  ".repeat(depth);
  const nextIndent = "  ".repeat(depth + 1);

  if (value instanceof Uint8Array) {
    return `new Uint8Array([${[...value].join(", ")}])`;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return `[\n${value.map((item) => `${nextIndent}${serializeManifestValue(item, depth + 1)}`).join(",\n")}\n${indent}]`;
  }
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value).filter(([, item]) => item !== undefined);
    if (entries.length === 0) return "{}";
    return `{\n${entries
      .map(([key, item]) => `${nextIndent}${JSON.stringify(key)}: ${serializeManifestValue(item, depth + 1)}`)
      .join(",\n")}\n${indent}}`;
  }
  return JSON.stringify(value);
}
