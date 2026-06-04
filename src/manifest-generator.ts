import { compileMarkdown } from "./compiler";
import type { AssetRef, DeckManifest } from "./deck";
import { resolveDeckFiles } from "./file-routing";

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
  const serializable = {
    decks: manifest.decks.map((deck) => ({
      ...deck,
      assets: deck.assets.map(({ body: _body, ...asset }) => asset),
    })),
  };

  return `import type { DeckManifest } from "hono-slides";\n\nexport const deckManifest = ${JSON.stringify(
    serializable,
    null,
    2,
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
