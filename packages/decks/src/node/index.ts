import { existsSync, watch } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { build as buildBrowserBundle } from "esbuild";
import { Hono } from "hono";
import type { DeckFileChange, DeckFileEntry, DeckManifest, LocalDeckIO } from "../deck/model";
import { compileMarkdown } from "../compiler/compiler";
import { createDevDeckRuntime } from "../runtime/dev-runtime";
import { resolveDeckFiles } from "../routing/file-routing";
import { buildDeckManifest, emitDeckManifestModule } from "../generator/manifest-generator";
import { compileMdxModuleDecks } from "../generator/mdx-module-generator";
import type { LinkCardOgpMetadata } from "../generator/mdx-module-generator";
import {
  applyDeckComponentRegistry,
  emitDeckComponentRegistryModule,
} from "../generator/component-registry";
import type { DeckComponentExport, ResolvedDeckComponentExport } from "../generator/component-registry";
import { emitDecksRouterModule } from "../generator/router-generator";
import { decksRouter } from "../server/router";

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
    decksRouter({
      source: runtime.source,
      dev: true,
    }),
  );

  return { app, localDeckIO, stop };
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

  const manifest = { decks: generated.decks.map((deck) => deck.deck) };
  return manifest;
}

async function resolveOgpMetadata(url: string): Promise<LinkCardOgpMetadata | undefined> {
  if (!isHttpUrl(url) || typeof fetch === "undefined") return undefined;

  try {
    const response = await fetch(url, {
      headers: { accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(1500),
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.toLowerCase().includes("text/html")) return undefined;

    return parseOgpHtml(await response.text(), url);
  } catch {
    return undefined;
  }
}

function parseOgpHtml(html: string, pageUrl: string): LinkCardOgpMetadata | undefined {
  const meta = collectHtmlMeta(html);
  const title = firstValue(meta, ["og:title", "twitter:title"]) ?? htmlTitle(html);
  const description = firstValue(meta, ["og:description", "twitter:description", "description"]);
  const image = absoluteUrl(firstValue(meta, ["og:image", "og:image:url", "twitter:image"]), pageUrl);
  const siteName = firstValue(meta, ["og:site_name", "application-name"]);
  const result = { title, description, image, siteName };

  return Object.values(result).some(Boolean) ? result : undefined;
}

function collectHtmlMeta(html: string): Map<string, string> {
  const meta = new Map<string, string>();
  const tagPattern = /<meta\b[^>]*>/gi;
  for (const match of html.matchAll(tagPattern)) {
    const attributes = parseHtmlAttributes(match[0]);
    const key = attributes.property ?? attributes.name;
    const content = attributes.content;
    if (key && content && !meta.has(key.toLowerCase())) {
      meta.set(key.toLowerCase(), decodeHtmlEntities(content.trim()));
    }
  }
  return meta;
}

function parseHtmlAttributes(tag: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const attributePattern = /([^\s"'<>/=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  for (const match of tag.matchAll(attributePattern)) {
    attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return attributes;
}

function firstValue(meta: Map<string, string>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = meta.get(key);
    if (value) return value;
  }
  return undefined;
}

function htmlTitle(html: string): string | undefined {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeHtmlEntities(match[1].replace(/\s+/g, " ").trim()) : undefined;
}

function absoluteUrl(value: string | undefined, base: string): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value, base).toString();
  } catch {
    return value;
  }
}

function decodeHtmlEntities(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
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

export async function writeDecksRouterModule(input: WriteDecksRouterModuleInput): Promise<void> {
  await mkdir(dirname(input.outFile), { recursive: true });
  await writeFile(input.outFile, emitDecksRouterModule(input), "utf8");
}

async function writeTextFile(path: string, contents: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents, "utf8");
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

function findClientEntryModule(paths: string[], root: string, slug: string): string | undefined {
  const base = `${normalizePath(root).replace(/\/$/, "")}/${slug}/components/client/index`;
  return paths.find((path) => {
    const normalized = normalizePath(path);
    return normalized === `${base}.tsx` || normalized === `${base}.ts` || normalized === `${base}.jsx` || normalized === `${base}.js`;
  });
}

interface ClientEntryModule {
  slug: string;
  sourcePath: string;
}

async function discoverClientComponentIds(input: {
  cwd: string;
  clientEntries: ClientEntryModule[];
}): Promise<Record<string, Record<string, string>>> {
  const result: Record<string, Record<string, string>> = {};
  for (const entry of input.clientEntries) {
    const source = await readFile(join(input.cwd, entry.sourcePath), "utf8");
    const exports = extractComponentExportNames(source);
    result[entry.slug] = Object.fromEntries(exports.map((name) => [name, clientComponentId(entry.slug, name)]));
  }
  return result;
}

async function emitClientEntryModule(input: {
  cwd: string;
  clientEntries: ClientEntryModule[];
  clientComponentIds: Record<string, Record<string, string>>;
}): Promise<string> {
  const imports: string[] = [];
  const registrations: string[] = [];

  for (const entry of input.clientEntries) {
    const ids = input.clientComponentIds[entry.slug] ?? {};
    for (const [exportName, clientId] of Object.entries(ids)) {
      const localName = clientImportName(entry.slug, exportName);
      imports.push(`import { ${exportName} as ${localName} } from ${JSON.stringify(join(input.cwd, entry.sourcePath))};`);
      registrations.push(`${JSON.stringify(clientId)}: ${localName}`);
    }
  }

  if (registrations.length === 0) return 'export const decksClientEntry = "";\n';

  const entryContents = `import { hydrateSlideIslands } from "@hono/decks/client";
${imports.join("\n")}

hydrateSlideIslands({
  components: {
    ${registrations.join(",\n    ")}
  }
});
`;
  const result = await buildBrowserBundle({
    stdin: {
      contents: entryContents,
      resolveDir: input.cwd,
      sourcefile: "hono-decks-client-entry.tsx",
      loader: "tsx",
    },
    bundle: true,
    write: false,
    format: "esm",
    platform: "browser",
    target: "es2022",
    jsx: "automatic",
    jsxImportSource: "hono/jsx/dom",
    nodePaths: nodeModuleFallbackPaths(input.cwd),
    sourcemap: false,
    minify: false,
  });
  const output = result.outputFiles[0];
  if (!output) throw new Error("Client entry did not produce output.");

  return `export const decksClientEntry = ${JSON.stringify(output.text)};\n`;
}

function nodeModuleFallbackPaths(cwd: string): string[] {
  const current = process.cwd();
  return [
    join(cwd, "node_modules"),
    join(cwd, "..", "node_modules"),
    join(cwd, "..", "..", "node_modules"),
    join(current, "node_modules"),
    join(current, "..", "node_modules"),
    join(current, "..", "..", "node_modules"),
  ];
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

function clientComponentId(slug: string, exportName: string): string {
  const base = `${exportName}__${safeIdentifier(slug)}`;
  return `${base}_${hashString(`${slug}:${exportName}`).slice(0, 8)}`;
}

function clientImportName(slug: string, exportName: string): string {
  return `${safeIdentifier(exportName)}__${safeIdentifier(slug)}_${hashString(`${slug}:${exportName}`).slice(0, 8)}`;
}

function hashString(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}

function safeIdentifier(value: string): string {
  return value.replace(/[^A-Za-z0-9_$]+/g, "_").replace(/^[^A-Za-z_$]+/, "_") || "_";
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
