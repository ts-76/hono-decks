import { existsSync, watch } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { Hono } from "hono";
import type { DeckFileChange, DeckFileEntry, DeckManifest, LocalDeckIO } from "../deck/model";
import { compileMarkdown } from "../compiler/compiler";
import { createDevDeckRuntime } from "../runtime/dev-runtime";
import { resolveDeckFiles } from "../routing/file-routing";
import { buildDeckManifest, emitDeckManifestModule } from "../generator/manifest-generator";
import {
  applyDeckComponentRegistry,
  emitDeckComponentRegistryModule,
} from "../generator/component-registry";
import type { DeckComponentExport, ResolvedDeckComponentExport } from "../generator/component-registry";
import { honoSlidesRouter } from "../server/router";

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

export interface CompileDecksInput extends BuildDeckManifestFromFileSystemInput {
  out: string;
  componentsOut?: string;
}

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

export interface CreateLocalDevSlidesAppInput extends BuildDeckManifestFromFileSystemInput {
  mountPath?: string;
  watchFileSystem?: CreateLocalDeckIOInput["watchFileSystem"];
}

export interface LocalDevSlidesApp {
  app: Hono;
  localDeckIO: LocalDeckIO;
  stop(): void;
}

export async function createLocalDevSlidesApp(input: CreateLocalDevSlidesAppInput): Promise<LocalDevSlidesApp> {
  const mountPath = normalizeMountPath(input.mountPath ?? "/slides");
  const localDeckIO = createLocalDeckIO({ cwd: input.cwd, root: input.root, watchFileSystem: input.watchFileSystem });
  const initial = await buildDeckManifestFromFileSystem({ cwd: input.cwd, root: input.root, mountPath });
  const runtime = createDevDeckRuntime({
    initialDecks: initial.decks,
    localDeckIO,
    compiler: { compileMarkdown },
    mountPath,
  });
  const stop = runtime.start();
  const app = new Hono();

  app.get("/", (c) => c.redirect(mountPath));
  app.route(
    mountPath,
    honoSlidesRouter({
      source: runtime.source,
      dev: true,
    }),
  );

  return { app, localDeckIO, stop };
}

export async function compileDecks(input: CompileDecksInput): Promise<DeckManifest> {
  const out = normalizeRelativePath(input.out, "Output path");
  const componentsOut = input.componentsOut
    ? normalizeRelativePath(input.componentsOut, "Components output path")
    : undefined;
  const root = normalizeDeckRoot(input.root);
  const paths = await listFiles(input.cwd, join(input.cwd, root));
  const initialManifest = await buildDeckManifestFromPaths({
    cwd: input.cwd,
    root,
    paths,
    mountPath: input.mountPath,
  });
  const componentExports = componentsOut
    ? await discoverDeckComponentExports({
        cwd: input.cwd,
        root,
        paths,
        componentsOut,
      })
    : [];
  const registry = applyDeckComponentRegistry({
    manifest: initialManifest,
    components: componentExports,
  });
  const manifest = registry.manifest;
  await writeDeckManifestModule({
    manifest,
    outFile: join(input.cwd, out),
  });
  if (componentsOut) {
    await writeDeckComponentRegistryModule({
      components: registry.components,
      outFile: join(input.cwd, componentsOut),
    });
  }
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

export async function writeDeckManifestModule(input: WriteDeckManifestModuleInput): Promise<void> {
  await mkdir(dirname(input.outFile), { recursive: true });
  await writeFile(input.outFile, emitDeckManifestModule(input.manifest), "utf8");
}

export async function writeDeckComponentRegistryModule(input: WriteDeckComponentRegistryModuleInput): Promise<void> {
  await mkdir(dirname(input.outFile), { recursive: true });
  await writeFile(input.outFile, emitDeckComponentRegistryModule(input.components), "utf8");
}

async function discoverDeckComponentExports(input: {
  cwd: string;
  root: string;
  paths: string[];
  componentsOut: string;
}): Promise<DeckComponentExport[]> {
  const resolved = resolveDeckFiles(input.paths, input.root);
  const components: DeckComponentExport[] = [];

  for (const deck of resolved) {
    if (deck.kind !== "directory") continue;
    const moduleSourcePath = findComponentModule(input.paths, input.root, deck.slug);
    if (!moduleSourcePath) continue;
    const source = await readFile(join(input.cwd, moduleSourcePath), "utf8");
    const modulePath = toImportPath(input.componentsOut, moduleSourcePath);
    components.push(
      ...extractComponentExportNames(source).map((exportName) => ({
        slug: deck.slug,
        sourcePath: moduleSourcePath,
        modulePath,
        exportName,
      })),
    );
  }

  return components;
}

function findComponentModule(paths: string[], root: string, slug: string): string | undefined {
  const base = `${normalizePath(root).replace(/\/$/, "")}/${slug}/components/index`;
  return paths.find((path) => {
    const normalized = normalizePath(path);
    return normalized === `${base}.tsx` || normalized === `${base}.ts` || normalized === `${base}.jsx` || normalized === `${base}.js`;
  });
}

function extractComponentExportNames(source: string): string[] {
  const names = new Set<string>();
  for (const match of source.matchAll(/\bexport\s+function\s+([A-Z][A-Za-z0-9_]*)\b/g)) {
    names.add(match[1]);
  }
  for (const match of source.matchAll(/\bexport\s+const\s+([A-Z][A-Za-z0-9_]*)\b/g)) {
    names.add(match[1]);
  }
  return [...names].sort();
}

function toImportPath(fromFile: string, targetFile: string): string {
  const fromDir = dirname(normalizePath(fromFile));
  const target = stripScriptExtension(normalizePath(targetFile));
  const relativePath = normalizePath(relative(fromDir, target));
  return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
}

function stripScriptExtension(path: string): string {
  return path.replace(/\/index\.(tsx|ts|jsx|js)$/, "").replace(/\.(tsx|ts|jsx|js)$/, "");
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

function normalizeMountPath(value: string): string {
  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.replace(/\/$/, "");
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
