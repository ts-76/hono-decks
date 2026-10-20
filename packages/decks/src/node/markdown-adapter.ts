import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { DecksBuildConfig } from "../server/define-decks";
import { createHonoMarkdownAdapter } from "../adapters/hono-markdown";

export interface MarkdownIsland {
  id: string;
  modulePath: string;
  hydrate: string;
}
export interface DeckMarkdownAdapter {
  read(source: string): { frontmatter: Record<string, unknown>; content: string; script: string };
  compile(
    source: string,
    input: { sourcePath: string },
  ): Promise<{
    code: string;
    headings: { depth: number; slug: string; text: string }[];
    clientCode: string;
    islands?: MarkdownIsland[];
  }>;
  client(islands: MarkdownIsland[]): string;
}
export async function loadMarkdownAdapter(
  selection: NonNullable<DecksBuildConfig["markdown"]>,
  cwd: string,
): Promise<DeckMarkdownAdapter> {
  if (selection === "void") return createHonoMarkdownAdapter(cwd, true);
  if (selection.adapter === "hono-decks/adapters/hono-markdown")
    return createHonoMarkdownAdapter(cwd, false, selection.options);
  const require = createRequire(resolve(cwd, "package.json"));
  const module = await import(pathToFileURL(require.resolve(selection.adapter)).href);
  if (typeof module.createMarkdownAdapter !== "function")
    throw new Error("Markdown adapter must export createMarkdownAdapter.");
  const adapter = await module.createMarkdownAdapter({ cwd, options: selection.options });
  if (![adapter?.read, adapter?.compile, adapter?.client].every((value) => typeof value === "function"))
    throw new Error("Markdown adapter must provide read, compile and client functions.");
  return adapter;
}
