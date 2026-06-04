import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import type { DeckFileEntry, DeckManifest, LocalDeckIO } from "./deck";
import { resolveDeckFiles } from "./file-routing";
import { buildDeckManifest, emitDeckManifestModule } from "./manifest-generator";

export interface BuildDeckManifestFromFileSystemInput {
  cwd: string;
  root: string;
  mountPath?: string;
}

export interface WriteDeckManifestModuleInput {
  manifest: DeckManifest;
  outFile: string;
}

export interface CompileDecksInput extends BuildDeckManifestFromFileSystemInput {
  out: string;
}

export interface CreateLocalDeckIOInput {
  cwd: string;
  root: string;
}

export async function compileDecks(input: CompileDecksInput): Promise<DeckManifest> {
  const out = normalizeRelativePath(input.out, "Output path");
  const manifest = await buildDeckManifestFromFileSystem(input);
  await writeDeckManifestModule({
    manifest,
    outFile: join(input.cwd, out),
  });
  return manifest;
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

    async writeMarkdown(slug, markdown) {
      const entry = await findDeckEntry(input, slug);
      if (!entry) throw new Error(`Unknown deck slug: "${slug}"`);
      await writeFile(join(input.cwd, entry.sourcePath), markdown, "utf8");
    },
  };
}

export async function buildDeckManifestFromFileSystem(
  input: BuildDeckManifestFromFileSystemInput,
): Promise<DeckManifest> {
  const root = normalizeDeckRoot(input.root);
  const rootDir = join(input.cwd, root);
  const paths = await listFiles(input.cwd, rootDir);

  return buildDeckManifest({
    root,
    paths,
    mountPath: input.mountPath,
    readText: (path) => readFile(join(input.cwd, path), "utf8"),
    readBinary: (path) => readFile(join(input.cwd, path)),
  });
}

export async function writeDeckManifestModule(input: WriteDeckManifestModuleInput): Promise<void> {
  await mkdir(dirname(input.outFile), { recursive: true });
  await writeFile(input.outFile, emitDeckManifestModule(input.manifest), "utf8");
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

async function listFiles(cwd: string, dir: string): Promise<string[]> {
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

function dirname(path: string): string {
  const normalized = normalizePath(path);
  return normalized.includes("/") ? normalized.slice(0, normalized.lastIndexOf("/")) : ".";
}

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\/+/, "").replace(/\/+/g, "/");
}

function normalizeDeckRoot(root: string): string {
  const normalized = normalizeRelativePath(root, "Deck root").replace(/\/$/, "");

  if (normalized === ".") {
    throw new Error("Deck root must be a relative path inside the current working directory");
  }

  return normalized;
}

function normalizeRelativePath(path: string, label: string): string {
  const normalized = normalizePath(path).replace(/\/$/, "");
  const segments = normalized.split("/");

  if (
    normalized === "" ||
    normalized.startsWith("/") ||
    /^[A-Za-z]:\//.test(normalized) ||
    segments.includes("..")
  ) {
    throw new Error(`${label} must be a relative path inside the current working directory`);
  }

  return normalized;
}
