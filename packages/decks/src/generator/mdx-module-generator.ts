import { compile } from "@mdx-js/mdx";
import remarkDirective from "remark-directive";
import { CompileError } from "../deck/model";
import {
  addUnknownFrontmatterWarnings,
  readFrontmatter,
  splitSlideSources,
  toDeckFrontmatter,
  toSlideFrontmatter,
} from "../deck/frontmatter";
import { combineSpeakerNotes, extractMdxCommentSpeakerNotes } from "../deck/speaker-notes";
import type { AssetRef, CompiledDeck, DeckKind, SlideFrontmatter } from "../deck/model";
import { parseDeckWithWarnings, type ParserWarning } from "../parser/parser";
import type { ResolvedDeckFile } from "../routing/file-routing";
import {
  addExternalAssetWarnings,
  buildAssetRefs,
  buildExternalAssetRefs,
  collectFrontmatterAssetCandidates,
  collectMarkdownAssetCandidates,
  componentImportPath,
  dirname,
  rewriteAssetUrls,
  rewriteRelativeMdxImports,
} from "./assets";
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
  let warnings: CompiledDeck["warnings"] = [];
  const deckMeta = toDeckFrontmatter(attrs, warnings);
  addUnknownFrontmatterWarnings(warnings, deckMeta.meta, "deck");
  const assets = [
    ...(await buildAssetRefs(entry.slug, entry.assetPaths, input)),
    ...collectGeneratedExternalAssetRefs(contentBody, deckMeta),
  ];
  const componentModulePath = componentImportPath(input.outDir, input.componentModulePaths?.[entry.slug]);
  const themeStyle = entry.kind === "directory" ? input.themeStyles?.[entry.slug] : undefined;
  const slideModules: GeneratedSlideModule[] = [];
  const slides: CompiledDeck["slides"] = [];

  for (let index = 0; index < slideSources.length; index += 1) {
    const { attrs: slideAttrs, body: slideBody } = readFrontmatter(slideSources[index]);
    const speakerNotes = extractMdxCommentSpeakerNotes(slideBody);
    const parsed = parseDeckWithWarnings(speakerNotes.body);
    warnings = warnings.concat(toGeneratedParserCompileWarnings(parsed.warnings, index));
    const firstParsedSlide = parsed.slides[0];
    const slideModulePath = `${input.outDir}/decks/${entry.slug}/slide-${index}.ts`;
    const slideMeta = toSlideFrontmatter(slideAttrs, warnings, {
      slideIndex: index,
      fallbackTransition: deckMeta.transition,
      fallbackTransitionDuration: deckMeta.transitionDuration,
      fallbackTransitionEasing: deckMeta.transitionEasing,
      fallbackTitle: firstParsedSlide?.title,
      fallbackLayout: firstParsedSlide?.layout,
      fallbackClassName: firstParsedSlide?.className,
    });
    addUnknownFrontmatterWarnings(warnings, slideMeta.meta, "slide", index);
    const moduleSource = [prelude, rewriteAssetUrls(speakerNotes.body, assets)].filter(Boolean).join("\n\n");
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
      notes: combineSpeakerNotes(slideMeta.notes, speakerNotes.notes),
    });
  }
  addExternalAssetWarnings(warnings, assets);

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

function collectGeneratedExternalAssetRefs(contentBody: string, deckMeta: Pick<CompiledDeck["meta"], "assets">): AssetRef[] {
  return buildExternalAssetRefs([
    ...collectMarkdownAssetCandidates(contentBody),
    ...collectFrontmatterAssetCandidates(deckMeta.assets),
  ]);
}

function generatedMdxParserWarnings(warnings: ParserWarning[]): ParserWarning[] {
  return warnings.filter((warning) => warning.code === "code-fence-unclosed");
}

function toGeneratedParserCompileWarnings(
  warnings: ParserWarning[],
  slideIndex: number,
): CompiledDeck["warnings"] {
  return generatedMdxParserWarnings(warnings).map((warning) => ({
    code: "parse-warning",
    message: warning.message,
    slideIndex,
  }));
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
