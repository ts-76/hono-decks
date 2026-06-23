import { CompileError } from "../deck/model";
import {
  addUnknownFrontmatterWarnings,
  readFrontmatter,
  splitSlideSources,
  toDeckFrontmatter,
  toSlideFrontmatter,
} from "../deck/frontmatter";
import {
  addExternalAssetWarnings,
  buildExternalAssetRefs,
  collectFrontmatterAssetCandidates,
  collectMarkdownAssetCandidates,
  isLocalRelativeAssetCandidate,
} from "../deck/assets";
import { parseDeck } from "../parser/parser";
import { renderBlock } from "../renderer/render-block";
import type {
  CompileDeckInput,
  CompiledDeck,
  CompiledSlide,
  ComponentPlaceholder,
  AssetRef,
  SlideTransition,
} from "../deck/model";
import type { SlideBlock, SlideNode } from "../shared/types";

export async function compileMarkdown(input: CompileDeckInput): Promise<CompiledDeck> {
  const { attrs: deckAttrs, body } = readFrontmatter(input.markdown);
  const deckAttrsForAssets = { ...deckAttrs };
  assertSingleFileAssetRules(input, input.markdown, deckAttrs);

  const slideSources = splitSlideSources(body);
  const warnings: CompiledDeck["warnings"] = [];
  const meta = toDeckFrontmatter(deckAttrs, warnings);
  addUnknownFrontmatterWarnings(warnings, meta.meta, "deck");
  const slides: CompiledSlide[] = slideSources.map((source, index) =>
    compileSlide(input.slug, source, index, warnings, meta.transition, meta.transitionDuration, meta.transitionEasing),
  );
  const assets = collectExternalAssetRefs(input.markdown, deckAttrsForAssets);
  addExternalAssetWarnings(warnings, assets);

  return {
    slug: input.slug,
    sourcePath: input.sourcePath,
    kind: input.kind,
    meta,
    slides,
    assets,
    warnings,
  };
}

function compileSlide(
  slug: string,
  source: string,
  index: number,
  warnings: CompiledDeck["warnings"],
  fallbackTransition: SlideTransition | undefined,
  fallbackTransitionDuration: string | undefined,
  fallbackTransitionEasing: string | undefined,
): CompiledSlide {
  const { attrs, body } = readFrontmatter(source);
  const parsed = parseDeck(body);
  for (const warning of parsed.warnings) {
    warnings.push({ code: "parse-warning", message: warning, slideIndex: index });
  }
  const blocks = parsed.slides[0]?.blocks ?? [];
  const nodes = parsed.slides[0]?.nodes ?? [];
  const components = collectComponents(slug, index, nodes, blocks);
  const firstParsedSlide = parsed.slides[0];
  const meta = toSlideFrontmatter(attrs, warnings, {
    slideIndex: index,
    fallbackTransition,
    fallbackTransitionDuration,
    fallbackTransitionEasing,
    fallbackTitle: firstParsedSlide?.title,
    fallbackLayout: firstParsedSlide?.layout,
    fallbackClassName: firstParsedSlide?.className,
  });
  addUnknownFrontmatterWarnings(warnings, meta.meta, "slide", index);

  return {
    index,
    meta,
    html: blocks.map(renderBlock).join("\n"),
    nodes,
    components,
    notes: meta.notes,
  };
}

function collectComponents(
  slug: string,
  slideIndex: number,
  nodes: SlideNode[],
  legacyBlocks: SlideBlock[],
): ComponentPlaceholder[] {
  const componentNodes = collectComponentNodes(nodes);
  const legacyComponents = legacyBlocks.filter(
    (block): block is Extract<SlideBlock, { type: "component" }> => block.type === "component",
  );
  const components = componentNodes.map((block, componentIndex) => ({
    id: `${slug}-${slideIndex}-${componentIndex}`,
    name: block.name,
    props: block.props,
    source: legacyComponents[componentIndex]?.raw ?? block.source ?? `<${block.name} />`,
  }));

  if (components.length > 0) return components;

  return legacyComponents.map((block, componentIndex) => ({
    id: `${slug}-${slideIndex}-${componentIndex}`,
    name: block.name,
    props: block.props,
    source: block.raw,
  }));
}

function collectComponentNodes(nodes: SlideNode[]): Array<Extract<SlideNode, { type: "component" }> & { source?: string }> {
  const components: Array<Extract<SlideNode, { type: "component" }> & { source?: string }> = [];
  for (const node of nodes) {
    if (node.type === "component") components.push(node);
    if ("children" in node) components.push(...collectComponentNodes(node.children));
  }
  return components;
}

function assertSingleFileAssetRules(input: CompileDeckInput, markdown: string, deckAttrs: Record<string, unknown>): void {
  if (input.kind !== "single-file") return;
  if (hasLocalRelativeAssetReference(markdown, deckAttrs)) {
    throw new CompileError(
      `Single-file deck ${input.sourcePath} cannot reference local relative assets.`,
      "single-file-local-asset",
    );
  }
}

function hasLocalRelativeAssetReference(markdown: string, deckAttrs: Record<string, unknown>): boolean {
  return [...collectMarkdownAssetCandidates(markdown), ...collectFrontmatterAssetCandidates(deckAttrs.assets)].some(
    isLocalRelativeAssetCandidate,
  );
}

function collectExternalAssetRefs(markdown: string, deckAttrs: Record<string, unknown>): AssetRef[] {
  return buildExternalAssetRefs([
    ...collectMarkdownAssetCandidates(markdown),
    ...collectFrontmatterAssetCandidates(deckAttrs.assets),
  ]);
}
