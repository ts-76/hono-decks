import type { DeckKind } from "../deck/model";

export interface ResolvedDeckFile {
  slug: string;
  sourcePath: string;
  kind: DeckKind;
  assetPaths: string[];
}

export function resolveDeckFiles(paths: string[], root = "decks"): ResolvedDeckFile[] {
  const normalizedRoot = normalizePath(root).replace(/\/$/, "");
  const decks = new Map<string, ResolvedDeckFile>();
  const assetsBySlug = new Map<string, string[]>();

  for (const inputPath of paths.map(normalizePath).sort()) {
    assertInsideRoot(inputPath, normalizedRoot);

    const relative = inputPath.slice(normalizedRoot.length + 1);
    const segments = relative.split("/");

    if (segments.length === 1 && segments[0].endsWith(".mdx")) {
      const slug = segments[0].replace(/\.mdx$/, "");
      addDeck(decks, {
        slug,
        sourcePath: inputPath,
        kind: "single-file",
        assetPaths: [],
      });
      continue;
    }

    if (segments.length === 2 && segments[1] === "deck.mdx") {
      addDeck(decks, {
        slug: segments[0],
        sourcePath: inputPath,
        kind: "directory",
        assetPaths: assetsBySlug.get(segments[0]) ?? [],
      });
      continue;
    }

    if (segments.length >= 3 && segments[1] === "assets") {
      const slug = segments[0];
      const assetPaths = assetsBySlug.get(slug) ?? [];
      assetPaths.push(inputPath);
      assetsBySlug.set(slug, assetPaths);

      const deck = decks.get(slug);
      if (deck?.kind === "directory") deck.assetPaths = assetPaths;
      continue;
    }

    if (inputPath.endsWith(".mdx")) {
      throw new Error(`Nested deck slugs are not supported in this slice: ${inputPath}`);
    }
  }

  return [...decks.values()].map((deck) => ({
    ...deck,
    assetPaths: [...deck.assetPaths].sort(),
  }));
}

function addDeck(decks: Map<string, ResolvedDeckFile>, next: ResolvedDeckFile): void {
  const current = decks.get(next.slug);
  if (current) {
    throw new Error(`Deck slug conflict for "${next.slug}": ${current.sourcePath} and ${next.sourcePath}`);
  }
  decks.set(next.slug, next);
}

function assertInsideRoot(path: string, root: string): void {
  if (path.includes("/../") || path.endsWith("/..") || path.startsWith("../")) {
    throw new Error(`Deck path escapes the root: ${path}`);
  }

  if (path !== root && !path.startsWith(`${root}/`)) {
    throw new Error(`Deck path is outside ${root}: ${path}`);
  }
}

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\/+/, "").replace(/\/+/g, "/");
}
