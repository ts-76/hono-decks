import { describe, expect, it } from "vitest";
import { createDeckAgentToolProvider } from "../src/agent/tools";
import type { DeckAgentEditProposal } from "../src/agent/contract";
import type { CompiledDeck } from "../src/deck/model";

const compiledDeck = {
  slug: "deck1",
  sourcePath: "decks/deck1.mdx",
  kind: "single-file",
  meta: { title: "Deck One", meta: {} },
  slides: [
    {
      index: 0,
      meta: { title: "Intro", meta: {} },
      html: "<h1>Intro</h1>",
      components: [],
      notes: "Speaker notes",
    },
  ],
  assets: [],
  warnings: [],
} satisfies CompiledDeck;

describe("createDeckAgentToolProvider", () => {
  it("exposes read and proposal tools without direct persistence tools", async () => {
    const provider = createDeckAgentToolProvider({
      slug: "deck1",
      markdown: "# Intro",
      compiledDeck,
    });

    expect(provider.name).toBe("deck");
    expect(Object.keys(provider.tools).sort()).toEqual([
      "compileMarkdown",
      "createPatch",
      "getCompiledDeck",
      "inspectSlides",
      "readDeck",
      "validatePatch",
    ]);
    expect(Object.keys(provider.tools)).not.toContain("createTitlePatch");
    expect(Object.keys(provider.tools)).not.toContain("writeDeck");
    expect(Object.keys(provider.tools)).not.toContain("saveDeck");

    await expect(provider.tools.readDeck.execute({})).resolves.toEqual({
      slug: "deck1",
      markdown: "# Intro",
      baseMarkdownHash: "mdx-d2750450",
    });
  });

  it("returns a compact compiled deck summary", async () => {
    const provider = createDeckAgentToolProvider({
      slug: "deck1",
      markdown: "# Intro",
      compiledDeck,
    });

    await expect(provider.tools.getCompiledDeck.execute({})).resolves.toEqual({
      slug: "deck1",
      title: "Deck One",
      slideCount: 1,
      warnings: [],
      slides: [
        {
          index: 0,
          title: "Intro",
          notes: "Speaker notes",
          componentCount: 0,
        },
      ],
    });
  });

  it("compiles markdown with structured success and error results", async () => {
    const provider = createDeckAgentToolProvider({
      slug: "deck1",
      markdown: "# Intro",
      compiledDeck,
      compiler: {
        async compileMarkdown(input) {
          if (input.markdown.includes("broken")) throw new Error("compile failed");
          return { ...compiledDeck, meta: { title: "Compiled", meta: {} } };
        },
      },
    });

    await expect(provider.tools.compileMarkdown.execute({ markdown: "# Updated" })).resolves.toMatchObject({
      ok: true,
      deck: { title: "Compiled", slideCount: 1 },
    });
    await expect(provider.tools.compileMarkdown.execute({ markdown: "broken" })).resolves.toEqual({
      ok: false,
      error: { message: "compile failed" },
    });
  });

  it("creates and validates patch proposals against the current markdown hash", async () => {
    const provider = createDeckAgentToolProvider({
      slug: "deck1",
      markdown: "# Intro",
      compiledDeck,
    });

    const proposal = (await provider.tools.createPatch.execute({
      oldText: "# Intro",
      newText: "# Better Intro",
      summary: "Tighten title",
    })) as DeckAgentEditProposal;

    expect(proposal).toEqual({
      type: "patch",
      baseMarkdownHash: "mdx-d2750450",
      summary: "Tighten title",
      patches: [{ path: "decks/deck1.mdx", oldText: "# Intro", newText: "# Better Intro" }],
    });
    await expect(provider.tools.validatePatch.execute(proposal)).resolves.toEqual({
      ok: true,
      errors: [],
      warnings: [],
    });
    await expect(
      provider.tools.validatePatch.execute({
        ...proposal,
        baseMarkdownHash: "mdx-stale",
      }),
    ).resolves.toMatchObject({
      ok: false,
      errors: ["Patch targets mdx-stale but current deck is mdx-d2750450."],
    });
  });

  it("rejects patch proposals that would fail the Hono apply route", async () => {
    const provider = createDeckAgentToolProvider({
      slug: "deck1",
      markdown: "Same\nSame",
      compiledDeck,
    });

    await expect(
      provider.tools.validatePatch.execute({
        type: "patch",
        baseMarkdownHash: "mdx-51fcc1d",
        patches: [{ path: "decks/other.mdx", oldText: "Same", newText: "Next" }],
      }),
    ).resolves.toEqual({
      ok: false,
      errors: [
        "Patch path must match current deck source: decks/deck1.mdx.",
        "Patch oldText is ambiguous: Same",
      ],
      warnings: [],
    });
  });
});
