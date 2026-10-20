import { resolve } from "node:path";
import { isLocalRelativeAssetCandidate } from "../deck/assets";
import { CompileError } from "../deck/model";
import type { CompiledDeck } from "../deck/model";
import {
  addUnknownFrontmatterWarnings,
  splitSlideSources,
  toDeckFrontmatter,
  toSlideFrontmatter,
} from "../deck/frontmatter";
import {
  buildAssetRefs,
  buildExternalAssetRefs,
  collectMarkdownAssetCandidates,
  collectFrontmatterAssetCandidates,
  addExternalAssetWarnings,
  dirname,
  rewriteAssetUrls,
  rewriteRelativeMdxImports,
} from "../generator/assets";
import { compileMdxModuleDecks } from "../generator/mdx-module-generator";
import type {
  CompileMdxModuleDecksInput,
  GeneratedMdxModuleDecks,
  GeneratedModuleDeck,
} from "../generator/mdx-module-generator";
import { emitModuleDecksRouter } from "../generator/mdx/emit";

import type { DeckMarkdownAdapter } from "./markdown-adapter";

export async function compileMarkdownDecks(
  input: CompileMdxModuleDecksInput,
  adapter: DeckMarkdownAdapter,
): Promise<GeneratedMdxModuleDecks> {
  const markdownEntries = input.decks.filter((entry) => entry.sourcePath.endsWith(".md"));
  const mdx = await compileMdxModuleDecks({
    ...input,
    decks: input.decks.filter((entry) => !entry.sourcePath.endsWith(".md")),
  });
  if (!markdownEntries.length) return mdx;
  const decks: GeneratedModuleDeck[] = [...mdx.decks];
  const clients = new Set<string>();
  const markdownIslands = new Map<string, { id: string; modulePath: string; hydrate: string }>();
  for (const entry of markdownEntries) {
    try {
      const source = await input.readText(entry.sourcePath);
      const parsed = adapter.read(source);
      if (input.clientComponentIds?.[entry.slug] && Object.keys(input.clientComponentIds[entry.slug]).length) {
        throw new Error(
          "Void Markdown slides support static components only; use MDX for hono-decks client components.",
        );
      }
      const warnings: CompiledDeck["warnings"] = [];
      const meta = toDeckFrontmatter(parsed.frontmatter, warnings);
      addUnknownFrontmatterWarnings(warnings, meta.meta, "deck");
      const assets = [
        ...(await buildAssetRefs(entry.slug, entry.assetPaths, input)),
        ...buildExternalAssetRefs([
          ...collectMarkdownAssetCandidates(parsed.content),
          ...collectFrontmatterAssetCandidates(meta.assets),
          ...collectFrontmatterAssetCandidates(parsed.frontmatter.background),
        ]),
      ];
      // Keep the established single-file asset restriction.
      const candidates = [
        ...collectMarkdownAssetCandidates(parsed.content),
        ...collectFrontmatterAssetCandidates(parsed.frontmatter.assets),
        ...collectFrontmatterAssetCandidates(parsed.frontmatter.background),
      ];
      if (entry.kind === "single-file" && candidates.some(isLocalRelativeAssetCandidate)) {
        throw new Error("Single-file Markdown decks cannot reference local relative assets; use a directory deck.");
      }
      let clientEntryRequired = false;
      const slideModules: GeneratedModuleDeck["slideModules"] = [];
      const slides: CompiledDeck["slides"] = [];
      for (const [index, slideSource] of splitMarkdownSlides(parsed.content).entries()) {
        const prelude = parsed.script ? `<script>\n${parsed.script}\n</script>\n` : "";
        const slide = adapter.read(prelude + slideSource);
        const path = `${input.outDir}/decks/${entry.slug}/slide-${index}.ts`;
        const mergedSource = `${prelude}---\n${JSON.stringify({ ...parsed.frontmatter, ...slide.frontmatter })}\n---\n${slide.content}`;
        const rewritten = rewriteAssetUrls(mergedSource, assets);
        const result = await adapter.compile(rewritten, {
          sourcePath: resolve(input.cwd ?? process.cwd(), entry.sourcePath),
        });
        clientEntryRequired ||= Boolean(result.clientCode || result.islands?.length);
        if (result.clientCode) clients.add(result.clientCode);
        for (const island of result.islands ?? []) markdownIslands.set(island.id, island);
        const slideMeta = toSlideFrontmatter(slide.frontmatter, warnings, {
          slideIndex: index,
          fallbackTitle: result.headings[0]?.text,
          fallbackTransition: meta.transition,
          fallbackTransitionDuration: meta.transitionDuration,
          fallbackTransitionEasing: meta.transitionEasing,
        });
        addUnknownFrontmatterWarnings(warnings, slideMeta.meta, "slide", index);
        slideModules.push({
          path,
          importPath: `./decks/${entry.slug}/slide-${index}`,
          code: `// @ts-nocheck\n${rewriteRelativeMdxImports(result.code, dirname(entry.sourcePath), dirname(path))}`,
        });
        slides.push({ index, meta: slideMeta, html: "", components: [], notes: slideMeta.notes });
      }
      addExternalAssetWarnings(warnings, assets);
      const themeStyle = input.themeStyles?.[entry.slug];
      decks.push({
        deck: {
          slug: entry.slug,
          sourcePath: entry.sourcePath,
          kind: entry.kind,
          clientEntryRequired,
          meta,
          slides,
          assets,
          warnings,
          themeStyle: themeStyle?.style,
          themeSourcePath: themeStyle?.sourcePath,
        },
        slideModules,
      });
    } catch (error) {
      throw new CompileError(
        `Void Markdown compile failed in ${entry.sourcePath}: ${error instanceof Error ? error.message : String(error)}`,
        "void-markdown-compile-error",
      );
    }
  }
  decks.sort((a, b) => a.deck.slug.localeCompare(b.deck.slug));
  return {
    decks,
    routerModule: emitModuleDecksRouter({ decks }),
    clientCode: [...clients].join("\n"),
    clientModules: [adapter.client([...markdownIslands.values()])].filter(Boolean),
    markdownIslands: [...markdownIslands.values()],
  };
}

/** Protect fenced code from the deck separator parser. */
export function splitMarkdownSlides(source: string): string[] {
  const fences: string[] = [];
  let prefix = "HONO_DECKS_FENCE_";
  while (source.includes(prefix)) prefix += "_";
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const protectedLines: string[] = [];
  for (let index = 0; index < lines.length; index++) {
    const open = /^ {0,3}(`{3,}|~{3,})/.exec(lines[index]);
    if (/^[ \t]+---[ \t]*$/.test(lines[index])) {
      protectedLines.push(`${prefix}${fences.push(lines[index]) - 1}_END`);
      continue;
    }
    if (!open) {
      protectedLines.push(lines[index]);
      continue;
    }
    const block = [lines[index]];
    const close = new RegExp(`^ {0,3}${open[1][0]}{${open[1].length},}[ \\t]*$`);
    let closed = false;
    while (++index < lines.length) {
      block.push(lines[index]);
      if (close.test(lines[index])) {
        closed = true;
        break;
      }
    }
    if (!closed) throw new Error("Markdown code fence is not closed.");
    protectedLines.push(`${prefix}${fences.push(block.join("\n")) - 1}_END`);
  }
  return splitSlideSources(protectedLines.join("\n")).map((slide) =>
    slide.replace(new RegExp(`${prefix}(\\d+)_END`, "g"), (_, id) => fences[Number(id)]),
  );
}
