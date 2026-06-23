import { compile } from "@mdx-js/mdx";
import remarkDirective from "remark-directive";
import { CompileError, SLIDE_TRANSITIONS } from "../deck/model";
import type { CompiledDeck, DeckFrontmatter, DeckKind, SlideFrontmatter } from "../deck/model";
import type { ResolvedDeckFile } from "../routing/file-routing";
import { buildAssetRefs, componentImportPath, dirname, rewriteAssetUrls, rewriteRelativeMdxImports } from "./mdx/assets";
import { emitModuleDecksRouter } from "./mdx/emit";
import { resolveLinkCardMetadataByUrl } from "./mdx/ogp";
import type { LinkCardOgpMetadata } from "./mdx/ogp";
import { remarkCodeHighlight, remarkDeckSyntax, remarkListFragments } from "./mdx/syntax";

export type { LinkCardOgpMetadata } from "./mdx/ogp";

export interface CompileMdxModuleDecksInput {
  root: string;
  outDir: string;
  mountPath?: string;
  decks: ResolvedDeckFile[];
  componentModulePaths?: Record<string, string>;
  clientComponentIds?: Record<string, Record<string, string>>;
  themeStyles?: Record<string, DeckThemeStyleEntry>;
  resolveOgp?(url: string): Promise<LinkCardOgpMetadata | undefined>;
  readText(path: string): Promise<string>;
  readBinary?(path: string): Promise<Uint8Array>;
}

export interface DeckThemeStyleEntry {
  sourcePath: string;
  style: string;
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
  const themeStyle = entry.kind === "directory" ? input.themeStyles?.[entry.slug] : undefined;
  const slideModules: GeneratedSlideModule[] = [];
  const slides: CompiledDeck["slides"] = [];
  const warnings: CompiledDeck["warnings"] = [];
  const deckMeta = toDeckFrontmatter(attrs, warnings);

  for (let index = 0; index < slideSources.length; index += 1) {
    const { attrs: slideAttrs, body: slideBody } = readFrontmatter(slideSources[index]);
    const slideModulePath = `${input.outDir}/decks/${entry.slug}/slide-${index}.ts`;
    const slideMeta = toSlideFrontmatter(slideAttrs, warnings, index, deckMeta.transition);
    const moduleSource = [prelude, rewriteAssetUrls(slideBody, assets)].filter(Boolean).join("\n\n");
    const rewrittenSource = rewriteRelativeMdxImports(moduleSource, dirname(entry.sourcePath), dirname(slideModulePath));
    const code = await compileMdxModule(rewrittenSource, entry.sourcePath, index, slideMeta.fragments, input.resolveOgp);

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
      meta: deckMeta,
      themeStyle: themeStyle?.style,
      themeSourcePath: themeStyle?.sourcePath,
      slides,
      assets,
      warnings,
    },
    slideModules,
  };
}

async function compileMdxModule(
  source: string,
  sourcePath: string,
  slideIndex: number,
  fragments: SlideFrontmatter["fragments"],
  resolveOgp: CompileMdxModuleDecksInput["resolveOgp"],
): Promise<string> {
  try {
    const linkCardMetadata = await resolveLinkCardMetadataByUrl(source, resolveOgp);
    const compiled = String(
      await compile(
        { path: `${sourcePath}#slide-${slideIndex + 1}`, value: source },
        {
          jsxRuntime: "automatic",
          jsxImportSource: "hono/jsx",
          format: "mdx",
          elementAttributeNameCase: "html",
          remarkPlugins: [
            remarkDirective,
            remarkDeckSyntax({ linkCardMetadata }),
            remarkListFragments(fragments),
            remarkCodeHighlight,
          ],
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

function toDeckFrontmatter(attrs: Record<string, unknown>, warnings: CompiledDeck["warnings"]): DeckFrontmatter {
  const meta = { ...attrs };
  return {
    title: takeString(meta, "title"),
    description: takeString(meta, "description"),
    author: takeString(meta, "author"),
    theme: takeString(meta, "theme"),
    transition: takeKnownFrontmatter(meta, "transition", SLIDE_TRANSITIONS, "none", warnings, undefined, "unknown-transition"),
    draft: takeBoolean(meta, "draft"),
    meta,
  };
}

function toSlideFrontmatter(
  attrs: Record<string, unknown>,
  warnings: CompiledDeck["warnings"],
  slideIndex: number,
  fallbackTransition: SlideFrontmatter["transition"],
): SlideFrontmatter {
  const meta = { ...attrs };
  return {
    title: takeString(meta, "title"),
    layout: takeString(meta, "layout"),
    className: takeString(meta, "class"),
    notes: takeString(meta, "notes"),
    background: takeString(meta, "background"),
    transition:
      takeKnownFrontmatter(meta, "transition", SLIDE_TRANSITIONS, "none", warnings, slideIndex, "unknown-transition") ??
      fallbackTransition,
    fragments: takeKnownFrontmatter(meta, "fragments", ["none", "manual", "list"], "none", warnings, slideIndex, "unknown-fragments"),
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

function takeKnownFrontmatter<const T extends string>(
  source: Record<string, unknown>,
  key: string,
  values: readonly T[],
  fallback: T,
  warnings: CompiledDeck["warnings"],
  slideIndex: number | undefined,
  code: string,
): T | undefined {
  const value = source[key];
  delete source[key];
  if (value === undefined) return undefined;
  if (typeof value === "string" && values.includes(value as T)) return value as T;
  warnings.push({
    code,
    message: `Unknown ${key} value "${String(value)}"; using ${fallback}.`,
    ...(slideIndex !== undefined ? { slideIndex } : {}),
  });
  return fallback;
}
