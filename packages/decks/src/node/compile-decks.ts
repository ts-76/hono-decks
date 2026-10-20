import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { CompiledDeck, CompiledSlide, DeckFileEntry, DeckManifest } from "../deck/model";
import { resolveDeckFiles } from "../routing/file-routing";
import { buildDeckManifest, emitDeckManifestModule } from "../generator/manifest-generator";
import { emitModuleDecksRouter } from "../generator/mdx/emit";
import { compileMarkdownDecks } from "./markdown-decks";
import { loadMarkdownAdapter } from "./markdown-adapter";
import type { DecksBuildConfig } from "../server/define-decks";
import { compileMdxModuleDecks } from "../generator/mdx-module-generator";
import type { DeckThemeStyleEntry, LinkCardOgpMetadata } from "../generator/mdx-module-generator";
import { emitDeckComponentRegistryModule } from "../generator/component-registry";
import type { ResolvedDeckComponentExport } from "../generator/component-registry";
import { emitDecksRouterModule } from "../generator/router-generator";
import { discoverClientComponentIds, emitClientEntryModule } from "./client-entry";
import type { ClientEntryModule } from "./client-entry";
import { listFiles } from "./local-deck-io";
import { publishGeneratedFiles, type GeneratedFile } from "./file-transaction";
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
  markdown?: DecksBuildConfig["markdown"];
  out: string;
  ogpCacheFile?: string;
  refreshOgp?: boolean;
  resolveOgp?(this: void, url: string): Promise<LinkCardOgpMetadata | undefined>;
}

/** Build information only; render using createDecks() from routerModulePath. */
export interface CompileDecksResult {
  outDir: string;
  routerModulePath: string;
  decks: DeckBuildSummary[];
}

export interface DeckBuildSummary extends Omit<CompiledDeck, "slides" | "componentRegistry"> {
  slides: (Pick<CompiledSlide, "index" | "meta" | "notes"> & { modulePath: string })[];
}

/** A successful compilation snapshot, before choosing a destination. */
export interface DeckModuleCompilation {
  result: CompileDecksResult;
  modules: GeneratedFile[];
  cacheFile?: GeneratedFile;
}

export async function compileDecks(input: CompileDecksInput): Promise<CompileDecksResult> {
  const compiled = await compileDeckModules(input);
  await publishGeneratedFiles([...compiled.modules, ...(compiled.cacheFile ? [compiled.cacheFile] : [])]);
  return compiled.result;
}

/** Shared by file output and Vite's in-memory module graph. Does not write files. */
export async function compileDeckModules(input: CompileDecksInput): Promise<DeckModuleCompilation> {
  const out = normalizeRelativePath(input.out, "Output directory");
  const root = normalizeDeckRoot(input.root);
  const paths = await listFiles(input.cwd, join(input.cwd, root));
  const resolved = resolveDeckFiles(paths, root, { markdown: Boolean(input.markdown) });
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
  const ogpCache = await createOgpCacheResolver({
    cwd: input.cwd,
    cacheFile: input.ogpCacheFile,
    refresh: input.refreshOgp,
    resolveOgp: input.resolveOgp ?? resolveOgpMetadata,
  });
  const adapter =
    input.markdown && resolved.some((entry) => entry.sourcePath.endsWith(".md"))
      ? await loadMarkdownAdapter(input.markdown, input.cwd)
      : undefined;
  const compileModules = adapter
    ? (value: Parameters<typeof compileMdxModuleDecks>[0]) => compileMarkdownDecks(value, adapter)
    : compileMdxModuleDecks;
  const generated = await compileModules({
    cwd: input.cwd,
    root,
    outDir: out,
    mountPath: input.mountPath,
    decks: resolved,
    componentModulePaths,
    clientComponentIds,
    themeStyles,
    resolveOgp: ogpCache.resolveOgp,
    readText: (path) => readFile(join(input.cwd, path), "utf8"),
    readBinary: (path) => readFile(join(input.cwd, path)),
  });

  // Client bundling and cache serialization must succeed before any output is changed.
  let clientCss = "";
  const clientEntry = await emitClientEntryModule({
    cwd: input.cwd,
    clientEntries: clientEntryPaths,
    clientComponentIds,
    extraCode: generated.clientCode,
    clientModules: generated.clientModules,
    onCss: (css) => {
      clientCss = css;
    },
  });
  if (clientCss) {
    for (const deck of generated.decks) {
      if (deck.deck.clientEntryRequired || Object.keys(deck.clientComponentIds ?? {}).length)
        deck.deck.themeStyle = [deck.deck.themeStyle, clientCss].filter(Boolean).join("\n");
    }
    generated.routerModule = emitModuleDecksRouter({ decks: generated.decks });
  }
  const files: GeneratedFile[] = generated.decks.flatMap((deck) =>
    deck.slideModules.map((slide) => ({ path: join(input.cwd, slide.path), content: slide.code })),
  );
  files.push(
    { path: join(input.cwd, out, "decks.ts"), content: generated.routerModule },
    { path: join(input.cwd, out, "client-entry.ts"), content: clientEntry },
  );
  const cacheFile = ogpCache.output();
  return {
    modules: files,
    cacheFile,
    result: {
      outDir: out,
      routerModulePath: `${out}/decks.ts`,
      decks: generated.decks.map(({ deck, slideModules }) => {
        const { slides, componentRegistry: _componentRegistry, ...metadata } = deck;
        return {
          ...metadata,
          slides: slides.map((slide, index) => ({
            index: slide.index,
            meta: slide.meta,
            notes: slide.notes,
            modulePath: slideModules[index].path,
          })),
        };
      }),
    },
  };
}

async function createOgpCacheResolver(input: {
  cwd: string;
  cacheFile: string | undefined;
  refresh: boolean | undefined;
  resolveOgp: (this: void, url: string) => Promise<LinkCardOgpMetadata | undefined>;
}): Promise<{
  resolveOgp?: (this: void, url: string) => Promise<LinkCardOgpMetadata | undefined>;
  output(): GeneratedFile | undefined;
}> {
  if (!input.cacheFile) {
    return {
      resolveOgp: input.resolveOgp,
      output: () => undefined,
    };
  }

  const cachePath = join(input.cwd, normalizeRelativePath(input.cacheFile, "OGP cache file"));
  const cache = await readOgpCache(cachePath);
  let dirty = false;

  return {
    async resolveOgp(url) {
      if (!input.refresh && cache[url]) return cache[url];
      if (!input.refresh) return undefined;

      const metadata = await input.resolveOgp(url);
      if (metadata) {
        cache[url] = metadata;
        dirty = true;
      }
      return metadata;
    },
    output() {
      return dirty ? { path: cachePath, content: `${JSON.stringify(cache, null, 2)}\n` } : undefined;
    },
  };
}

async function readOgpCache(path: string): Promise<Record<string, LinkCardOgpMetadata>> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") return {};
    throw error;
  }

  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("OGP cache file must contain a JSON object");
  }

  const cache: Record<string, LinkCardOgpMetadata> = {};
  for (const [url, value] of Object.entries(parsed)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const metadata = value as Record<string, unknown>;
    cache[url] = {
      ...(typeof metadata.title === "string" ? { title: metadata.title } : {}),
      ...(typeof metadata.description === "string" ? { description: metadata.description } : {}),
      ...(typeof metadata.image === "string" ? { image: metadata.image } : {}),
      ...(typeof metadata.siteName === "string" ? { siteName: metadata.siteName } : {}),
    };
  }
  return cache;
}

function isNodeError(error: unknown): error is Error & { code?: string } {
  return error instanceof Error && "code" in error;
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

function findComponentModule(paths: string[], root: string, slug: string): string | undefined {
  const base = `${normalizePath(root).replace(/\/$/, "")}/${slug}/components/index`;
  return paths.find((path) => {
    const normalized = normalizePath(path);
    return (
      normalized === `${base}.tsx` ||
      normalized === `${base}.ts` ||
      normalized === `${base}.jsx` ||
      normalized === `${base}.js`
    );
  });
}

function findClientEntryModule(
  paths: string[],
  root: string,
  slug: string,
): ClientEntryModule["sourcePath"] | undefined {
  const base = `${normalizePath(root).replace(/\/$/, "")}/${slug}/components/client/index`;
  return paths.find((path) => {
    const normalized = normalizePath(path);
    return (
      normalized === `${base}.tsx` ||
      normalized === `${base}.ts` ||
      normalized === `${base}.jsx` ||
      normalized === `${base}.js`
    );
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
