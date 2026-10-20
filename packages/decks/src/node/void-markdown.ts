import {
  compileMdxModuleDecks,
  type CompileMdxModuleDecksInput,
  type GeneratedMdxModuleDecks,
} from "../generator/mdx-module-generator";
import { compileMarkdownDecks } from "./markdown-decks";
import { loadMarkdownAdapter } from "./markdown-adapter";
export { compileMarkdownDecks, splitMarkdownSlides } from "./markdown-decks";

/** Compatibility entry for existing Node consumers. */
export async function compileVoidMarkdownDecks(input: CompileMdxModuleDecksInput): Promise<GeneratedMdxModuleDecks> {
  if (!input.decks.some((entry) => entry.sourcePath.endsWith(".md"))) return compileMdxModuleDecks(input);
  return compileMarkdownDecks(input, await loadMarkdownAdapter("void", input.cwd ?? process.cwd()));
}
