import { describe, expect, it, vi } from "vitest";

vi.mock("agents", () => ({
  Agent: class {},
}));

import { buildChatResult, buildSuggestion } from "../src/agent";
import { SlideAssistant } from "../src/agent";
import type { HonoSlidesAgentChatInput } from "../src/router";
import type { Env } from "../src/types";

const chatInput = {
  slug: "deck1",
  sessionId: "session-1",
  agentInstanceName: "deck-5-deck1-session-9-session-1",
  mode: "chat",
  baseMarkdownHash: "mdx-b5765d09",
  sourcePath: "decks/deck1/deck.mdx",
  markdown: "# Raw Deck",
  instruction: "Improve this",
  activeSlide: 0,
} satisfies HonoSlidesAgentChatInput;

describe("SlideAssistant", () => {
  it("builds a chat result for normal chat mode", async () => {
    await expect(buildChatResult(testEnv(), chatInput)).resolves.toMatchObject({
      source: "heuristic",
      suggestion: expect.stringContaining("Improve this"),
    });
  });

  it("builds a patch proposal for code mode without saving", async () => {
    await expect(buildChatResult(testEnv(), { ...chatInput, mode: "code" })).resolves.toMatchObject({
      source: "heuristic",
      message: "編集 proposal を作成しました。保存は Hono の apply/save route で行ってください。",
      suggestion: expect.stringContaining("Improve this"),
      proposal: {
        type: "patch",
        baseMarkdownHash: "mdx-b5765d09",
        summary: "Improve this",
        patches: [
          {
            path: "decks/deck1/deck.mdx",
            oldText: "# Raw Deck",
            newText: "# Raw Deck\n\n<!-- Improve this -->",
          },
        ],
      },
    });
  });

  it("uses a code mode generator when one is available", async () => {
    const generateCodeModeResult = vi.fn().mockResolvedValue({
      source: "workers-ai-codemode",
      message: "Code Mode proposal ready.",
      proposal: {
        type: "patch",
        baseMarkdownHash: "mdx-b5765d09",
        summary: "Tighten the title",
        patches: [
          {
            path: "decks/deck1/deck.mdx",
            oldText: "# Raw Deck",
            newText: "# Sharper Deck",
          },
        ],
      },
    });

    await expect(
      buildChatResult(testEnv(), { ...chatInput, mode: "code" }, { generateCodeModeResult }),
    ).resolves.toMatchObject({
      source: "workers-ai-codemode",
      message: "Code Mode proposal ready.",
      proposal: {
        type: "patch",
        baseMarkdownHash: "mdx-b5765d09",
        summary: "Tighten the title",
      },
    });
    expect(generateCodeModeResult).toHaveBeenCalledWith(testEnv(), { ...chatInput, mode: "code" });
  });

  it("falls back when code mode returns an invalid edit proposal", async () => {
    const generateCodeModeResult = vi.fn().mockResolvedValue({
      source: "workers-ai-codemode",
      message: "Code Mode proposal ready.",
      proposal: {
        type: "patch",
        baseMarkdownHash: "mdx-stale",
        summary: "Tighten the title",
        patches: [
          {
            path: "decks/deck1/deck.mdx",
            oldText: "# Raw Deck",
            newText: "# Sharper Deck",
          },
        ],
      },
    });

    await expect(
      buildChatResult(testEnv(), { ...chatInput, mode: "code" }, { generateCodeModeResult }),
    ).resolves.toMatchObject({
      source: "heuristic",
      message: "編集 proposal を作成しました。保存は Hono の apply/save route で行ってください。",
      proposal: {
        type: "patch",
        baseMarkdownHash: "mdx-b5765d09",
      },
    });
  });

  it("falls back when code mode returns no edit proposal", async () => {
    const generateCodeModeResult = vi.fn().mockResolvedValue({
      source: "workers-ai-codemode",
      message: "No concrete edits.",
    });

    await expect(
      buildChatResult(testEnv(), { ...chatInput, mode: "code" }, { generateCodeModeResult }),
    ).resolves.toMatchObject({
      source: "heuristic",
      proposal: {
        type: "patch",
        baseMarkdownHash: "mdx-b5765d09",
      },
    });
  });

  it("falls back when code mode returns a patch for another path without sourcePath input", async () => {
    const generateCodeModeResult = vi.fn().mockResolvedValue({
      source: "workers-ai-codemode",
      message: "Code Mode proposal ready.",
      proposal: {
        type: "patch",
        baseMarkdownHash: "mdx-b5765d09",
        summary: "Wrong path",
        patches: [
          {
            path: "decks/other.mdx",
            oldText: "# Raw Deck",
            newText: "# Other Deck",
          },
        ],
      },
    });

    await expect(
      buildChatResult(testEnv(), { ...chatInput, sourcePath: undefined, mode: "code" }, { generateCodeModeResult }),
    ).resolves.toMatchObject({
      source: "heuristic",
      proposal: {
        type: "patch",
        baseMarkdownHash: "mdx-b5765d09",
        patches: [{ path: "decks/deck1.mdx" }],
      },
    });
  });

  it("falls back to the local code proposal when code mode generation fails", async () => {
    const generateCodeModeResult = vi.fn().mockRejectedValue(new Error("model unavailable"));

    await expect(
      buildChatResult(testEnv(), { ...chatInput, mode: "code" }, { generateCodeModeResult }),
    ).resolves.toMatchObject({
      source: "heuristic",
      proposal: {
        type: "patch",
        baseMarkdownHash: "mdx-b5765d09",
      },
    });
  });

  it("handles POST /chat requests", async () => {
    const agent = Object.create(SlideAssistant.prototype) as SlideAssistant & {
      env: Env;
      state: { revisionCount: number };
      setState(state: { lastInstruction?: string; revisionCount: number }): void;
    };
    agent.env = testEnv();
    agent.state = { revisionCount: 0 };
    agent.setState = (state) => {
      agent.state = { revisionCount: state.revisionCount };
    };

    const response = await agent.onRequest(
      new Request("https://example.test/agents/slide-assistant/deck1/chat", {
        method: "POST",
        body: JSON.stringify({ ...chatInput, mode: "code" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      source: "heuristic",
      proposal: { type: "patch", baseMarkdownHash: "mdx-b5765d09" },
    });
    expect(agent.state.revisionCount).toBe(1);
  });

  it("keeps the legacy suggestion helper working", async () => {
    await expect(
      buildSuggestion(testEnv(), { markdown: "# Raw Deck", instruction: "Improve this", activeSlide: 0 }),
    ).resolves.toMatchObject({
      source: "heuristic",
      suggestion: expect.stringContaining("Improve this"),
    });
  });
});

function testEnv(): Env {
  return {} as Env;
}
