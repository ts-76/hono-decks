import { compile } from "@mdx-js/mdx";
import { CompileError } from "../deck/model";
import type { AssetRef, CompiledDeck, DeckFrontmatter, DeckKind, SlideFrontmatter } from "../deck/model";
import type { ResolvedDeckFile } from "../routing/file-routing";

export interface CompileMdxModuleDecksInput {
  root: string;
  outDir: string;
  mountPath?: string;
  decks: ResolvedDeckFile[];
  componentModulePaths?: Record<string, string>;
  clientComponentIds?: Record<string, Record<string, string>>;
  readText(path: string): Promise<string>;
  readBinary?(path: string): Promise<Uint8Array>;
}

export interface GeneratedModuleDeck {
  deck: CompiledDeck;
  slideModules: GeneratedSlideModule[];
  componentModulePath?: string;
  clientComponentIds?: Record<string, string>;
}

export interface GeneratedSlideModule {
  path: string;
  importPath: string;
  code: string;
}

export interface GeneratedMdxModuleDecks {
  decks: GeneratedModuleDeck[];
  routerModule: string;
}

export async function compileMdxModuleDecks(input: CompileMdxModuleDecksInput): Promise<GeneratedMdxModuleDecks> {
  const decks = await Promise.all(input.decks.map((entry) => compileMdxModuleDeck(input, entry)));
  return {
    decks,
    routerModule: emitModuleDecksRouter({ decks }),
  };
}

async function compileMdxModuleDeck(
  input: CompileMdxModuleDecksInput,
  entry: ResolvedDeckFile,
): Promise<GeneratedModuleDeck> {
  const source = await input.readText(entry.sourcePath);
  const { attrs, body } = readFrontmatter(source);
  const { prelude, body: contentBody } = extractDeckPrelude(body);
  const slideSources = splitSlideSources(contentBody);
  const assets = await buildAssetRefs(entry.slug, entry.assetPaths, input);
  const componentModulePath = componentImportPath(input.outDir, input.componentModulePaths?.[entry.slug]);
  const slideModules: GeneratedSlideModule[] = [];
  const slides: CompiledDeck["slides"] = [];

  for (let index = 0; index < slideSources.length; index += 1) {
    const { attrs: slideAttrs, body: slideBody } = readFrontmatter(slideSources[index]);
    const slideModulePath = `${input.outDir}/decks/${entry.slug}/slide-${index}.ts`;
    const moduleSource = [prelude, rewriteAssetUrls(slideBody, assets)].filter(Boolean).join("\n\n");
    const rewrittenSource = rewriteRelativeMdxImports(moduleSource, dirname(entry.sourcePath), dirname(slideModulePath));
    const code = await compileMdxModule(rewrittenSource, entry.sourcePath, index);
    const slideMeta = toSlideFrontmatter(slideAttrs);

    slideModules.push({
      path: slideModulePath,
      importPath: `./decks/${entry.slug}/slide-${index}`,
      code,
    });
    slides.push({
      index,
      meta: slideMeta,
      html: "",
      components: [],
      notes: slideMeta.notes,
    });
  }

  return {
    componentModulePath,
    clientComponentIds: input.clientComponentIds?.[entry.slug],
    deck: {
      slug: entry.slug,
      sourcePath: entry.sourcePath,
      kind: entry.kind,
      meta: toDeckFrontmatter(attrs),
      slides,
      assets,
      warnings: [],
    },
    slideModules,
  };
}

async function compileMdxModule(source: string, sourcePath: string, slideIndex: number): Promise<string> {
  try {
    const compiled = String(
      await compile(
        { path: `${sourcePath}#slide-${slideIndex + 1}`, value: source },
        {
          jsxRuntime: "automatic",
          jsxImportSource: "hono/jsx",
          format: "mdx",
          elementAttributeNameCase: "html",
        },
      ),
    );
    return `// @ts-nocheck\n${compiled}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CompileError(
      `MDX compile failed in ${sourcePath} slide ${slideIndex + 1}: ${message}`,
      "mdx-compile-error",
    );
  }
}

function emitModuleDecksRouter(input: { decks: GeneratedModuleDeck[] }): string {
  const slideImports = input.decks
    .flatMap((deck) =>
      deck.slideModules.map(
        (slide, index) => `import ${slideImportName(deck.deck.slug, index)} from ${JSON.stringify(slide.importPath)};`,
      ),
    )
    .join("\n");
  const componentImports = input.decks
    .filter((deck) => deck.componentModulePath)
    .map((deck) => `import * as ${componentImportName(deck.deck.slug)} from ${JSON.stringify(deck.componentModulePath)};`)
    .join("\n");

  return `// @ts-nocheck
import { defineDecks } from "@hono/decks";
import type { DecksRouterOverrides } from "@hono/decks";
import { decksClientEntry } from "./client-entry";
${slideImports}
${componentImports}

function withClientComponentIds(module, clientIds) {
  const registry = {};
  for (const [name, value] of Object.entries(module)) {
    const clientId = clientIds[name];
    if (typeof value === "function") {
      registry[name] = clientId ? { component: value, clientId } : value;
      continue;
    }
    if (value && typeof value === "object" && "component" in value) {
      registry[name] = clientId ? { ...value, clientId } : value;
    }
  }
  return registry;
}

export const decks = defineDecks({
  clientEntryAsset: decksClientEntry,
  decks: [
${input.decks.map(emitDeckObject).join(",\n")}
  ]
});

export function decksRouter(options: DecksRouterOverrides = {}) {
  return decks.router(options);
}
`;
}

function emitDeckObject(deck: GeneratedModuleDeck): string {
  return `    {
      slug: ${JSON.stringify(deck.deck.slug)},
      sourcePath: ${JSON.stringify(deck.deck.sourcePath)},
      kind: ${JSON.stringify(deck.deck.kind)},
      meta: ${serializeValue(deck.deck.meta, 3)},
      assets: ${serializeValue(deck.deck.assets, 3)},
      componentRegistry: ${
        deck.componentModulePath
          ? `withClientComponentIds(${componentImportName(deck.deck.slug)}, ${serializeValue(deck.clientComponentIds ?? {}, 3)})`
          : "{}"
      },
      warnings: [],
      slides: [
${deck.deck.slides
  .map(
    (slide) => `        {
          index: ${slide.index},
          meta: ${serializeValue(slide.meta, 5)},
          html: "",
          components: [],
          notes: ${serializeValue(slide.notes, 5)},
          render: ${slideImportName(deck.deck.slug, slide.index)}
        }`,
  )
  .join(",\n")}
      ]
    }`;
}

function readFrontmatter(source: string): { attrs: Record<string, unknown>; body: string } {
  const normalized = source.replace(/\r\n/g, "\n").trimStart();
  if (!normalized.startsWith("---\n")) return { attrs: {}, body: source.trim() };

  const end = normalized.indexOf("\n---", 4);
  if (end === -1) throw new Error("Frontmatter block is not closed.");

  const rawAttrs = normalized.slice(4, end).trim();
  const body = normalized.slice(end + 4).replace(/^\n/, "").trim();
  return { attrs: parseFrontmatterAttrs(rawAttrs), body };
}

function parseFrontmatterAttrs(source: string): Record<string, unknown> {
  const attrs: Record<string, unknown> = {};
  const lines = source.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = /^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/.exec(line);
    if (!match) continue;
    attrs[match[1]] = parseScalar(match[2]);
  }

  return attrs;
}

function parseScalar(value: string): unknown {
  const trimmed = value.trim().replace(/^['"]|['"]$/g, "");
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}

function extractDeckPrelude(source: string): { prelude: string; body: string } {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const prelude: string[] = [];
  let cursor = 0;

  while (cursor < lines.length) {
    const line = lines[cursor];
    if (line.trim() === "") {
      prelude.push(line);
      cursor += 1;
      continue;
    }
    if (/^\s*(import|export)\s/.test(line)) {
      prelude.push(line);
      cursor += 1;
      continue;
    }
    break;
  }

  return {
    prelude: prelude.join("\n").trim(),
    body: lines.slice(cursor).join("\n").trim(),
  };
}

function splitSlideSources(source: string): string[] {
  const lines = source.replace(/\r\n/g, "\n").trim().split("\n");
  const slides: string[] = [];
  let current: string[] = [];
  let cursor = 0;

  while (cursor < lines.length) {
    if (isFence(lines[cursor])) {
      if (looksLikeFrontmatterFence(lines, cursor) && findFrontmatterEnd(lines, cursor) === -1) {
        throw new CompileError("Frontmatter block is not closed.", "frontmatter-unclosed");
      }

      if (isFrontmatterStart(lines, cursor)) {
        if (hasMeaningfulLines(current)) {
          slides.push(current.join("\n").trim());
        }
        current = [];
        const frontmatterEnd = findFrontmatterEnd(lines, cursor);
        current.push(...lines.slice(cursor, frontmatterEnd + 1));
        cursor = frontmatterEnd + 1;
        continue;
      }

      if (hasMeaningfulLines(current)) {
        slides.push(current.join("\n").trim());
        current = [];
      }
      cursor += 1;
      continue;
    }

    current.push(lines[cursor]);
    cursor += 1;
  }

  if (hasMeaningfulLines(current)) {
    slides.push(current.join("\n").trim());
  }

  return slides;
}

function isFrontmatterStart(lines: string[], index: number): boolean {
  return looksLikeFrontmatterFence(lines, index) && findFrontmatterEnd(lines, index) > index;
}

function looksLikeFrontmatterFence(lines: string[], index: number): boolean {
  if (!isFence(lines[index])) return false;
  const next = lines[index + 1];
  return next != null && /^([A-Za-z_][A-Za-z0-9_-]*):\s*/.test(next);
}

function findFrontmatterEnd(lines: string[], start: number): number {
  for (let index = start + 1; index < lines.length; index += 1) {
    if (isFence(lines[index])) return index;
  }
  return -1;
}

function isFence(line: string): boolean {
  return /^---\s*$/.test(line);
}

function hasMeaningfulLines(lines: string[]): boolean {
  return lines.some((line) => line.trim() !== "");
}

async function buildAssetRefs(
  slug: string,
  assetPaths: string[],
  input: CompileMdxModuleDecksInput,
): Promise<AssetRef[]> {
  return Promise.all(
    assetPaths.map(async (sourcePath) => ({
      sourcePath,
      publicPath: `${normalizeMountPath(input.mountPath ?? `/${input.root}`)}/${encodeURIComponent(slug)}/assets/${assetName(
        sourcePath,
        input.root,
        slug,
      )}`,
      type: "local" as const,
      contentType: contentTypeForPath(sourcePath),
      body: input.readBinary ? ((await input.readBinary(sourcePath)) as BodyInit) : undefined,
    })),
  );
}

function rewriteAssetUrls(source: string, assets: AssetRef[]): string {
  let result = source;
  for (const asset of assets) {
    const assetPath = localAssetRelativePath(asset.sourcePath);
    result = result.replaceAll(`./assets/${assetPath}`, asset.publicPath);
    result = result.replace(new RegExp(`(?<!/)assets/${escapeRegExp(assetPath)}`, "g"), asset.publicPath);
  }
  return result;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function rewriteRelativeMdxImports(source: string, sourceDir: string, generatedDir: string): string {
  return source.replace(/(from\s+|import\s+)(["'])(\.[^"']+)\2/g, (_match, prefix: string, quote: string, specifier: string) => {
    const target = normalizePath(`${sourceDir}/${specifier}`);
    return `${prefix}${quote}${toRelativeImportPath(generatedDir, target)}${quote}`;
  });
}

function componentImportPath(outDir: string, sourcePath: string | undefined): string | undefined {
  if (!sourcePath) return undefined;
  const source = sourcePath.replace(/\/index\.(tsx|ts|jsx|js)$/, "");
  return toRelativeImportPath(outDir, source);
}

function slideImportName(slug: string, index: number): string {
  return `Slide_${safeIdentifier(slug)}_${index}`;
}

function componentImportName(slug: string): string {
  return `Components_${safeIdentifier(slug)}`;
}

function safeIdentifier(value: string): string {
  return value.replace(/[^A-Za-z0-9_$]+/g, "_").replace(/^[^A-Za-z_$]+/, "_") || "_";
}

function toDeckFrontmatter(attrs: Record<string, unknown>): DeckFrontmatter {
  const meta = { ...attrs };
  return {
    title: takeString(meta, "title"),
    description: takeString(meta, "description"),
    author: takeString(meta, "author"),
    theme: takeString(meta, "theme"),
    draft: takeBoolean(meta, "draft"),
    meta,
  };
}

function toSlideFrontmatter(attrs: Record<string, unknown>): SlideFrontmatter {
  const meta = { ...attrs };
  return {
    title: takeString(meta, "title"),
    layout: takeString(meta, "layout"),
    className: takeString(meta, "class"),
    notes: takeString(meta, "notes"),
    background: takeString(meta, "background"),
    transition: takeString(meta, "transition"),
    meta,
  };
}

function takeString(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key];
  delete source[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function takeBoolean(source: Record<string, unknown>, key: string): boolean | undefined {
  const value = source[key];
  delete source[key];
  return typeof value === "boolean" ? value : undefined;
}

function serializeValue(value: unknown, depth: number): string {
  const indent = "  ".repeat(depth);
  const nextIndent = "  ".repeat(depth + 1);

  if (value === undefined) return "undefined";
  if (value instanceof Uint8Array) return `new Uint8Array([${[...value].join(", ")}])`;
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return `[\n${value.map((item) => `${nextIndent}${serializeValue(item, depth + 1)}`).join(",\n")}\n${indent}]`;
  }
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value).filter(([, item]) => item !== undefined);
    if (entries.length === 0) return "{}";
    return `{\n${entries
      .map(([key, item]) => `${nextIndent}${JSON.stringify(key)}: ${serializeValue(item, depth + 1)}`)
      .join(",\n")}\n${indent}}`;
  }
  return JSON.stringify(value);
}

function assetName(sourcePath: string, root: string, slug: string): string {
  const normalizedPath = normalizePath(sourcePath);
  const prefix = `${normalizePath(root).replace(/\/$/, "")}/${slug}/assets/`;
  const relative = normalizedPath.startsWith(prefix)
    ? normalizedPath.slice(prefix.length)
    : (normalizedPath.split("/").at(-1) ?? normalizedPath);
  return relative.split("/").map(encodeURIComponent).join("/");
}

function localAssetRelativePath(sourcePath: string): string {
  const marker = "/assets/";
  const normalized = normalizePath(sourcePath);
  const markerIndex = normalized.indexOf(marker);
  return markerIndex === -1 ? (normalized.split("/").at(-1) ?? normalized) : normalized.slice(markerIndex + marker.length);
}

function normalizeMountPath(value: string): string {
  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.replace(/\/$/, "");
}

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\/+/, "").replace(/\/+/g, "/");
}

function dirname(path: string): string {
  const normalized = normalizePath(path);
  const index = normalized.lastIndexOf("/");
  return index === -1 ? "." : normalized.slice(0, index);
}

function toRelativeImportPath(fromDir: string, target: string): string {
  const fromParts = normalizePath(fromDir).split("/").filter(Boolean);
  const targetParts = normalizePath(target).split("/").filter(Boolean);
  while (fromParts.length > 0 && targetParts.length > 0 && fromParts[0] === targetParts[0]) {
    fromParts.shift();
    targetParts.shift();
  }
  const relative = [...fromParts.map(() => ".."), ...targetParts].join("/");
  return relative.startsWith(".") ? relative : `./${relative || "."}`;
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
