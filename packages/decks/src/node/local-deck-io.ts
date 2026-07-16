import { existsSync, watch } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import type { DeckFileChange, DeckFileEntry, LocalDeckIO } from "../deck/model";
import { resolveDeckFiles } from "../routing/file-routing";
import { normalizeDeckRoot, normalizePath, normalizeRelativePath } from "./path-utils";

export interface CreateLocalDeckIOInput {
  cwd: string;
  root: string;
  pathExists?(path: string): boolean;
  watchFileSystem?(
    path: string,
    options: { recursive: boolean },
    listener: (eventType: "rename" | "change", filename: string | null) => void,
  ): { close(): void };
}

export function createLocalDeckIO(input: CreateLocalDeckIOInput): LocalDeckIO {
  return {
    async listFiles() {
      return listDeckEntries(input);
    },

    async readMarkdown(slug) {
      const entry = await findDeckEntry(input, slug);
      if (!entry) return null;
      return readFile(join(input.cwd, entry.sourcePath), "utf8");
    },

    async readAsset(path) {
      const root = normalizeDeckRoot(input.root);
      const assetPath = normalizeRelativePath(path, "Asset path");
      if (assetPath !== root && !assetPath.startsWith(`${root}/`)) {
        throw new Error(`Asset path is outside ${root}: ${assetPath}`);
      }
      return readFile(join(input.cwd, assetPath));
    },

    watch(onFileChange) {
      const root = normalizeDeckRoot(input.root);
      const rootDir = join(input.cwd, root);
      const watchFileSystem = input.watchFileSystem ?? watch;
      const watcher = watchFileSystem(rootDir, { recursive: true }, (eventType, filename) => {
        if (!filename) return;
        const path = normalizePath(join(root, filename));
        onFileChange({
          type: fileChangeType(eventType, join(input.cwd, path), input.pathExists ?? existsSync),
          path,
          slug: slugForDeckPath(path, root),
        });
      });
      return () => watcher.close();
    },
  };
}

export async function listFiles(cwd: string, dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const paths = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) return listFiles(cwd, fullPath);
      if (entry.isFile()) return [normalizePath(relative(cwd, fullPath))];
      return [];
    }),
  );

  return paths.flat().sort();
}

async function listDeckEntries(input: CreateLocalDeckIOInput): Promise<DeckFileEntry[]> {
  const root = normalizeDeckRoot(input.root);
  const paths = await listFiles(input.cwd, join(input.cwd, root));
  return resolveDeckFiles(paths, root).map(({ slug, sourcePath, kind }) => ({
    slug,
    sourcePath,
    kind,
  }));
}

async function findDeckEntry(input: CreateLocalDeckIOInput, slug: string): Promise<DeckFileEntry | undefined> {
  return (await listDeckEntries(input)).find((entry) => entry.slug === slug);
}

function fileChangeType(
  eventType: "rename" | "change",
  fullPath: string,
  pathExists: (path: string) => boolean,
): DeckFileChange["type"] {
  if (eventType === "change") return "changed";
  return pathExists(fullPath) ? "created" : "deleted";
}

function slugForDeckPath(path: string, root: string): string | undefined {
  const normalizedRoot = normalizeDeckRoot(root);
  if (path !== normalizedRoot && !path.startsWith(`${normalizedRoot}/`)) return undefined;

  const relativePath = path.slice(normalizedRoot.length + 1);
  const segments = relativePath.split("/");
  if (segments.length === 1 && segments[0].endsWith(".mdx")) return segments[0].replace(/\.mdx$/, "");
  if (segments.length >= 2 && segments[1] === "deck.mdx") return segments[0];
  if (segments.length >= 3 && segments[1] === "assets") return segments[0];
  return undefined;
}
