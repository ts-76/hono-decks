import { describe, expect, it } from "vitest";
import { createDeckCodeModeTool } from "../src/agent-codemode";
import type { Executor } from "@cloudflare/codemode";
import type { ToolProvider } from "@cloudflare/codemode";
import type { CompiledDeck } from "../src/deck";

const compiledDeck = {
  slug: "deck1",
  sourcePath: "decks/deck1/deck.mdx",
  kind: "directory",
  meta: { title: "Deck One", meta: {} },
  slides: [],
  assets: [],
  warnings: [],
} satisfies CompiledDeck;

describe("createDeckCodeModeTool", () => {
  it("wraps deck tools in a Cloudflare Code Mode tool", async () => {
    const calls: unknown[] = [];
    const executor = {
      async execute() {
        return { result: "ok" };
      },
    } satisfies Executor;

    const tool = await createDeckCodeModeTool({
      slug: "deck1",
      markdown: "# Raw Deck",
      compiledDeck,
      executor,
      createCodeTool: (input) => {
        calls.push(input);
        return { kind: "code-tool" } as never;
      },
    });

    expect(tool).toEqual({ kind: "code-tool" });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      tools: [{ name: "deck" }],
      executor,
    });
  });

  it("keeps the deck provider write-free inside Code Mode", async () => {
    let providerTools: string[] = [];
    await createDeckCodeModeTool({
      slug: "deck1",
      markdown: "# Raw Deck",
      compiledDeck,
      executor: {
        async execute() {
          return { result: "ok" };
        },
      },
      createCodeTool: (input) => {
        providerTools = Object.keys((input.tools as ToolProvider[])[0].tools as Record<string, unknown>);
        return {} as never;
      },
    });

    expect(providerTools).toEqual([
      "readDeck",
      "getCompiledDeck",
      "compileMarkdown",
      "inspectSlides",
      "createPatch",
      "validatePatch",
    ]);
    expect(providerTools).not.toContain("createTitlePatch");
    expect(providerTools).not.toContain("writeDeck");
    expect(providerTools).not.toContain("saveDeck");
  });
});
