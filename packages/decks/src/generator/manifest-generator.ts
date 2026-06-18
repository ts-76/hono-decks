import { compileMarkdown } from "../compiler/compiler";
import type { AssetRef, DeckManifest } from "../deck/model";
import { resolveDeckFiles } from "../routing/file-routing";

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

  return `import type { DeckManifest } from "@hono/decks";\n\nexport const deckManifest = ${serializeManifestValue(
    serializable,
    0,
  )} satisfies DeckManifest;\n\nexport const manifest = deckManifest;\n`;
}

async function buildAssetRefs(
  slug: string,
  assetPaths: string[],
  input: BuildDeckManifestInput,
): Promise<AssetRef[]> {
  return Promise.all(
    assetPaths.map(async (sourcePath) => {
      return {
        sourcePath,
        publicPath: `${normalizeMountPath(input.mountPath ?? `/${input.root}`)}/${encodeURIComponent(slug)}/assets/${assetName(
          sourcePath,
          input.root,
          slug,
        )}`,
        type: "local",
        contentType: contentTypeForPath(sourcePath),
        body: input.readBinary ? ((await input.readBinary(sourcePath)) as BodyInit) : undefined,
      };
    }),
  );
}

function assetName(sourcePath: string, root: string, slug: string): string {
  const normalizedPath = normalizePath(sourcePath);
  const prefix = `${normalizePath(root).replace(/\/$/, "")}/${slug}/assets/`;
  const relative = normalizedPath.startsWith(prefix)
    ? normalizedPath.slice(prefix.length)
    : (normalizedPath.split("/").at(-1) ?? normalizedPath);
  return relative.split("/").map(encodeURIComponent).join("/");
}

function normalizeMountPath(value: string): string {
  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.replace(/\/$/, "");
}

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\/+/, "").replace(/\/+/g, "/");
}

function contentTypeForPath(path: string): string | undefined {
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".webp")) return "image/webp";
  return undefined;
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
