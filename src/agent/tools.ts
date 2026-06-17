import type { ToolProvider } from "@cloudflare/codemode";
import { createDeckMarkdownHash } from "./contract";
import { compileMarkdown } from "../deck/compiler";
import type { CompiledDeck, CompileDeckInput, DeckCompiler, DeckKind } from "../deck/model";
import type { DeckAgentEditProposal, DeckAgentPatch, DeckAgentProposalValidation } from "./contract";

export interface CreateDeckAgentToolProviderInput {
  slug: string;
  markdown: string;
  compiledDeck?: CompiledDeck;
  compiler?: DeckCompiler;
  sourcePath?: string;
  kind?: DeckKind;
}

export interface CompiledDeckSummary {
  slug: string;
  title?: string;
  slideCount: number;
  warnings: CompiledDeck["warnings"];
  slides: CompiledSlideSummary[];
}

export interface CompiledSlideSummary {
  index: number;
  title?: string;
  notes?: string;
  componentCount: number;
}

type SimpleToolProvider = ToolProvider & {
  tools: Record<string, { description?: string; execute: (args: unknown) => Promise<unknown> }>;
};

export function createDeckAgentToolProvider(input: CreateDeckAgentToolProviderInput): SimpleToolProvider {
  const sourcePath = input.sourcePath ?? input.compiledDeck?.sourcePath ?? `decks/${input.slug}.mdx`;
  const kind = input.kind ?? input.compiledDeck?.kind ?? "single-file";
  const baseMarkdownHash = createDeckMarkdownHash(input.markdown);
  const compiler = input.compiler ?? { compileMarkdown };

  return {
    name: "deck",
    types: deckAgentToolTypes(),
    tools: {
      readDeck: {
        description: "Read the current raw MDX deck. This tool never writes files.",
        execute: async () => ({
          slug: input.slug,
          markdown: input.markdown,
          baseMarkdownHash,
        }),
      },
      getCompiledDeck: {
        description: "Read the current compiled deck summary, if one is available.",
        execute: async () => (input.compiledDeck ? summarizeCompiledDeck(input.compiledDeck) : null),
      },
      compileMarkdown: {
        description: "Compile a candidate markdown string and return a structured success or error result.",
        execute: async (args: unknown) => compileCandidateMarkdown(compiler, { slug: input.slug, sourcePath, kind }, args),
      },
      inspectSlides: {
        description: "Return compact slide metadata for the current compiled deck.",
        execute: async () => (input.compiledDeck ? summarizeCompiledDeck(input.compiledDeck).slides : []),
      },
      createPatch: {
        description: "Create a patch proposal for the current deck. This tool does not save the patch.",
        execute: async (args: unknown) => createPatchProposal(sourcePath, baseMarkdownHash, args),
      },
      validatePatch: {
        description: "Validate that a patch proposal targets the current deck revision and text.",
        execute: async (args: unknown) => validatePatchProposal(input.markdown, baseMarkdownHash, sourcePath, args),
      },
    },
  };
}

async function compileCandidateMarkdown(
  compiler: DeckCompiler,
  base: Pick<CompileDeckInput, "slug" | "sourcePath" | "kind">,
  args: unknown,
): Promise<{ ok: true; deck: CompiledDeckSummary } | { ok: false; error: { message: string; code?: string } }> {
  try {
    const markdown = readStringProperty(args, "markdown") ?? "";
    const deck = await compiler.compileMarkdown({ ...base, markdown });
    return { ok: true, deck: summarizeCompiledDeck(deck) };
  } catch (error) {
    return {
      ok: false,
      error: {
        message: error instanceof Error ? error.message : String(error),
        ...(typeof error === "object" && error !== null && "code" in error ? { code: String(error.code) } : {}),
      },
    };
  }
}

function summarizeCompiledDeck(deck: CompiledDeck): CompiledDeckSummary {
  return {
    slug: deck.slug,
    title: deck.meta.title,
    slideCount: deck.slides.length,
    warnings: deck.warnings,
    slides: deck.slides.map((slide) => ({
      index: slide.index,
      title: slide.meta.title,
      notes: slide.notes,
      componentCount: slide.components.length,
    })),
  };
}

function createPatchProposal(
  path: string,
  baseMarkdownHash: string,
  args: unknown,
): DeckAgentEditProposal {
  return {
    type: "patch",
    baseMarkdownHash,
    summary: readStringProperty(args, "summary"),
    patches: [
      {
        path,
        oldText: readRequiredStringProperty(args, "oldText"),
        newText: readRequiredStringProperty(args, "newText"),
      },
    ],
  };
}

function validatePatchProposal(
  markdown: string,
  currentHash: string,
  sourcePath: string,
  args: unknown,
): DeckAgentProposalValidation {
  const proposal = args as Partial<DeckAgentEditProposal>;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (proposal.baseMarkdownHash !== currentHash) {
    errors.push(`Patch targets ${String(proposal.baseMarkdownHash)} but current deck is ${currentHash}.`);
  }

  const patches = "patches" in proposal && Array.isArray(proposal.patches) ? proposal.patches : [];
  for (const patch of patches as Partial<DeckAgentPatch>[]) {
    if (patch.path !== sourcePath) {
      errors.push(`Patch path must match current deck source: ${sourcePath}.`);
    }
    if (typeof patch.oldText !== "string" || patch.oldText.length === 0) {
      errors.push("Patch oldText must be a non-empty string.");
      continue;
    }
    const matchCount = markdown.split(patch.oldText).length - 1;
    if (matchCount === 0) errors.push(`Patch oldText was not found: ${patch.oldText}`);
    if (matchCount > 1) errors.push(`Patch oldText is ambiguous: ${patch.oldText}`);
  }

  return { ok: errors.length === 0, errors, warnings };
}

function readStringProperty(args: unknown, key: string): string | undefined {
  if (typeof args !== "object" || args === null || !(key in args)) return undefined;
  const value = (args as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

function readRequiredStringProperty(args: unknown, key: string): string {
  const value = readStringProperty(args, key);
  if (value == null || value === "") throw new Error(`${key} must be a non-empty string`);
  return value;
}

function deckAgentToolTypes(): string {
  return `declare namespace deck {
  function readDeck(): Promise<{ slug: string; markdown: string; baseMarkdownHash: string }>;
  function getCompiledDeck(): Promise<CompiledDeckSummary | null>;
  function compileMarkdown(input: { markdown: string }): Promise<{ ok: true; deck: CompiledDeckSummary } | { ok: false; error: { message: string; code?: string } }>;
  function inspectSlides(): Promise<CompiledSlideSummary[]>;
  function createPatch(input: { oldText: string; newText: string; summary?: string }): Promise<DeckAgentEditProposal>;
  function validatePatch(input: DeckAgentEditProposal): Promise<DeckAgentProposalValidation>;
}`;
}
