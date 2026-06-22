import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { DeckFileEntry, DeckManifest } from "../deck/model";
import { resolveDeckFiles } from "../routing/file-routing";
import { buildDeckManifest, emitDeckManifestModule } from "../generator/manifest-generator";
import { compileMdxModuleDecks } from "../generator/mdx-module-generator";
import type { DeckThemeStyleEntry, LinkCardOgpMetadata } from "../generator/mdx-module-generator";
import { emitDeckComponentRegistryModule } from "../generator/component-registry";
import type { ResolvedDeckComponentExport } from "../generator/component-registry";
import { emitDecksRouterModule } from "../generator/router-generator";
import { discoverClientComponentIds, emitClientEntryModule } from "./client-entry";
import type { ClientEntryModule } from "./client-entry";
import { listFiles } from "./local-deck-io";
import { resolveOgpMetadata } from "./ogp";
import { dirname, normalizeDeckRoot, normalizePath, normalizeRelativePath } from "./path-utils";

export interface BuildDeckManifestFromFileSystemInput {
  cwd: string;
  root: string;
  mountPath?: string;
}

export interface WriteDeckManifestModuleInput {
  manifest: DeckManifest;
  outFile: string;
}

export interface WriteDeckComponentRegistryModuleInput {
  components: ResolvedDeckComponentExport[];
  outFile: string;
}

export interface WriteDecksRouterModuleInput {
  manifestModulePath: string;
  componentRegistryModulePath?: string;
  outFile: string;
}

export interface CompileDecksInput extends BuildDeckManifestFromFileSystemInput {
  out: string;
  resolveOgp?(url: string): Promise<LinkCardOgpMetadata | undefined>;
}

export async function compileDecks(input: CompileDecksInput): Promise<DeckManifest> {
  const out = normalizeRelativePath(input.out, "Output directory");
  const root = normalizeDeckRoot(input.root);
  const paths = await listFiles(input.cwd, join(input.cwd, root));
  const resolved = resolveDeckFiles(paths, root);
  const componentModulePaths = Object.fromEntries(
    resolved.flatMap((deck) => {
      const path = deck.kind === "directory" ? findComponentModule(paths, root, deck.slug) : undefined;
      return path ? [[deck.slug, path]] : [];
    }),
  );
  const clientEntryPaths = resolved.flatMap((deck) => {
    const path = deck.kind === "directory" ? findClientEntryModule(paths, root, deck.slug) : undefined;
    return path ? [{ slug: deck.slug, sourcePath: path }] : [];
  });
  const themeStyles = await discoverDeckThemeStyles({ cwd: input.cwd, root, paths, decks: resolved });
  const clientComponentIds = await discoverClientComponentIds({
    cwd: input.cwd,
    clientEntries: clientEntryPaths,
  });
  const generated = await compileMdxModuleDecks({
    root,
    outDir: out,
    mountPath: input.mountPath,
    decks: resolved,
    componentModulePaths,
    clientComponentIds,
    themeStyles,
    resolveOgp: input.resolveOgp ?? resolveOgpMetadata,
    readText: (path) => readFile(join(input.cwd, path), "utf8"),
    readBinary: (path) => readFile(join(input.cwd, path)),
  });

  for (const deck of generated.decks) {
    for (const slide of deck.slideModules) {
      await writeTextFile(join(input.cwd, slide.path), slide.code);
    }
  }
  await writeTextFile(join(input.cwd, out, "decks.ts"), generated.routerModule);
  await writeTextFile(
    join(input.cwd, out, "client-entry.ts"),
    await emitClientEntryModule({ cwd: input.cwd, clientEntries: clientEntryPaths, clientComponentIds }),
  );

  return { decks: generated.decks.map((deck) => deck.deck) };
}

export async function buildDeckManifestFromFileSystem(
  input: BuildDeckManifestFromFileSystemInput,
): Promise<DeckManifest> {
  const root = normalizeDeckRoot(input.root);
  const rootDir = join(input.cwd, root);
  const paths = await listFiles(input.cwd, rootDir);

  return buildDeckManifestFromPaths({
    cwd: input.cwd,
    root,
    paths,
    mountPath: input.mountPath,
  });
}

export async function writeDeckManifestModule(input: WriteDeckManifestModuleInput): Promise<void> {
  await mkdir(dirname(input.outFile), { recursive: true });
  await writeFile(input.outFile, emitDeckManifestModule(input.manifest), "utf8");
}

export async function writeDeckComponentRegistryModule(input: WriteDeckComponentRegistryModuleInput): Promise<void> {
  await mkdir(dirname(input.outFile), { recursive: true });
  await writeFile(input.outFile, emitDeckComponentRegistryModule(input.components), "utf8");
}

export async function writeDecksRouterModule(input: WriteDecksRouterModuleInput): Promise<void> {
  await mkdir(dirname(input.outFile), { recursive: true });
  await writeFile(input.outFile, emitDecksRouterModule(input), "utf8");
}

async function buildDeckManifestFromPaths(input: {
  cwd: string;
  root: string;
  paths: string[];
  mountPath?: string;
}): Promise<DeckManifest> {
  return buildDeckManifest({
    root: input.root,
    paths: input.paths,
    mountPath: input.mountPath,
    readText: (path) => readFile(join(input.cwd, path), "utf8"),
    readBinary: (path) => readFile(join(input.cwd, path)),
  });
}

async function writeTextFile(path: string, contents: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents, "utf8");
}

function findComponentModule(paths: string[], root: string, slug: string): string | undefined {
  const base = `${normalizePath(root).replace(/\/$/, "")}/${slug}/components/index`;
  return paths.find((path) => {
    const normalized = normalizePath(path);
    return normalized === `${base}.tsx` || normalized === `${base}.ts` || normalized === `${base}.jsx` || normalized === `${base}.js`;
  });
}

function findClientEntryModule(paths: string[], root: string, slug: string): ClientEntryModule["sourcePath"] | undefined {
  const base = `${normalizePath(root).replace(/\/$/, "")}/${slug}/components/client/index`;
  return paths.find((path) => {
    const normalized = normalizePath(path);
    return normalized === `${base}.tsx` || normalized === `${base}.ts` || normalized === `${base}.jsx` || normalized === `${base}.js`;
  });
}

async function discoverDeckThemeStyles(input: {
  cwd: string;
  root: string;
  paths: string[];
  decks: DeckFileEntry[];
}): Promise<Record<string, DeckThemeStyleEntry>> {
  const result: Record<string, DeckThemeStyleEntry> = {};

  for (const deck of input.decks) {
    if (deck.kind !== "directory") continue;
    const sourcePath = findDeckThemeStyle(input.paths, input.root, deck.slug);
    if (!sourcePath) continue;
    result[deck.slug] = {
      sourcePath,
      style: await readFile(join(input.cwd, sourcePath), "utf8"),
    };
  }

  return result;
}

function findDeckThemeStyle(paths: string[], root: string, slug: string): string | undefined {
  const base = `${normalizePath(root).replace(/\/$/, "")}/${slug}`;
  const themePath = `${base}/theme.css`;
  const stylesEntryPath = `${base}/styles/index.css`;
  const hasTheme = paths.includes(themePath);
  const hasStylesEntry = paths.includes(stylesEntryPath);

  if (hasTheme && hasStylesEntry) {
    throw new Error(`Deck ${slug} has both ${themePath} and ${stylesEntryPath}. Use only one theme CSS entry.`);
  }

  return hasTheme ? themePath : hasStylesEntry ? stylesEntryPath : undefined;
}
