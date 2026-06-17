import { describe, expect, it } from "vitest";
import { applyDeckAgentProposal } from "../src/agent/apply";

describe("applyDeckAgentProposal", () => {
  it("applies all patches in memory and returns the next markdown once", () => {
    expect(
      applyDeckAgentProposal(
        "A\nB",
        {
          type: "patch",
          baseMarkdownHash: "mdx-ac0ef4d0",
          patches: [
            { path: "decks/deck1.mdx", oldText: "A", newText: "AA" },
            { path: "decks/deck1.mdx", oldText: "B", newText: "BB" },
          ],
        },
        { sourcePath: "decks/deck1.mdx" },
      ),
    ).toEqual({ ok: true, markdown: "AA\nBB", baseMarkdownHash: "mdx-ac0ef4d0" });
  });

  it("rejects missing proposal and invalid replacement markdown", () => {
    expect(applyDeckAgentProposal("# Deck", undefined)).toEqual({
      ok: false,
      status: 400,
      error: "proposal must be an object",
    });
    expect(
      applyDeckAgentProposal("# Deck", {
        type: "replacement",
        baseMarkdownHash: "mdx-4eb1a04f",
      }),
    ).toEqual({
      ok: false,
      status: 400,
      error: "replacement proposal markdown must be a string",
    });
  });

  it("rejects missing patch arrays and missing patch text", () => {
    expect(
      applyDeckAgentProposal("# Deck", {
        type: "patch",
        baseMarkdownHash: "mdx-4eb1a04f",
        patches: [],
      }),
    ).toEqual({
      ok: false,
      status: 400,
      error: "patch proposal patches must be a non-empty array",
    });
    expect(
      applyDeckAgentProposal("# Deck", {
        type: "patch",
        baseMarkdownHash: "mdx-4eb1a04f",
        patches: [{ path: "decks/deck1.mdx", oldText: "", newText: "# Next" }],
      }),
    ).toEqual({
      ok: false,
      status: 400,
      error: "patch oldText must be a non-empty string",
    });
  });

  it("rejects missing or ambiguous patch matches", () => {
    expect(
      applyDeckAgentProposal("# Deck", {
        type: "patch",
        baseMarkdownHash: "mdx-4eb1a04f",
        patches: [{ path: "decks/deck1.mdx", oldText: "Missing", newText: "Next" }],
      }),
    ).toEqual({
      ok: false,
      status: 422,
      error: "Patch oldText was not found: Missing",
    });
    expect(
      applyDeckAgentProposal("Same\nSame", {
        type: "patch",
        baseMarkdownHash: "mdx-51fcc1d",
        patches: [{ path: "decks/deck1.mdx", oldText: "Same", newText: "Next" }],
      }),
    ).toEqual({
      ok: false,
      status: 422,
      error: "Patch oldText is ambiguous: Same",
    });
  });
});
