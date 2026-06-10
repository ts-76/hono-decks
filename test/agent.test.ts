import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("agents", () => ({
  Agent: class {},
}));
vi.mock("@cloudflare/ai-chat", () => ({
  AIChatAgent: class {},
}));

import type { HonoSlidesAgentChatInput } from "../src/router";
import type { Env } from "../src/types";

type SlideAssistantInstance = InstanceType<typeof import("../src/agent").SlideAssistant>;

let buildChatResult: typeof import("../src/agent").buildChatResult;
let buildSuggestion: typeof import("../src/agent").buildSuggestion;
let SlideAssistant: typeof import("../src/agent").SlideAssistant;

beforeAll(async () => {
  const agent = await import("../src/agent");
  buildChatResult = agent.buildChatResult;
  buildSuggestion = agent.buildSuggestion;
  SlideAssistant = agent.SlideAssistant;
});

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
  it("returns an error when normal chat has no usable model response", async () => {
    await expect(buildChatResult(testEnv(), chatInput)).rejects.toThrow("Workers AI did not produce a usable chat response.");
  });

  it("returns an error when code mode lacks a usable proposal", async () => {
    await expect(buildChatResult(testEnv(), { ...chatInput, mode: "code" })).rejects.toThrow(
      "Code Mode did not produce a usable edit proposal.",
    );
  });

  it("does not build a local title patch when code mode is unavailable", async () => {
    await expect(
      buildChatResult(testEnv(), {
        ...chatInput,
        mode: "code",
        markdown: "# Hono Slides\n\nCloudflare Workers で動く Slidev-like deck",
        instruction: "タイトルを変更してみて",
        baseMarkdownHash: createDeckMarkdownHashForTest("# Hono Slides\n\nCloudflare Workers で動く Slidev-like deck"),
      }),
    ).rejects.toThrow("Code Mode did not produce a usable edit proposal.");
  });

  it("creates an explicit title patch when the user provides the exact new title", async () => {
    const markdown = "# Hono Slides\n\nCloudflare Workers で動く Slidev-like deck";

    await expect(
      buildChatResult(testEnv(), {
        ...chatInput,
        mode: "code",
        markdown,
        instruction: "タイトルを「Hono Slides 実践ガイド」に変更する編集案を作成してください",
        baseMarkdownHash: createDeckMarkdownHashForTest(markdown),
      }),
    ).resolves.toMatchObject({
      source: "agent-command",
      message: "タイトルを「Hono Slides 実践ガイド」に変更します。",
      proposal: {
        type: "patch",
        summary: "タイトルを「Hono Slides 実践ガイド」に変更します。",
        patches: [
          {
            oldText: "# Hono Slides",
            newText: "# Hono Slides 実践ガイド",
          },
        ],
      },
    });
  });

  it("does not build a local content patch for generic edit proposal requests", async () => {
    const markdown = "# Hono Slides\n\nCloudflare Workers で動く Slidev-like deck";

    await expect(
      buildChatResult(testEnv(), {
        ...chatInput,
        mode: "chat",
        markdown,
        instruction: "編集案を提示してください",
        baseMarkdownHash: createDeckMarkdownHashForTest(markdown),
      }),
    ).rejects.toThrow("Code Mode did not produce a usable edit proposal.");
  });

  it("does not build a local follow-up proposal from recent context", async () => {
    const markdown = "# Hono Slides\n\nCloudflare Workers で動く Slidev-like deck";

    await expect(
      buildChatResult(testEnv(), {
        ...chatInput,
        mode: "chat",
        markdown,
        instruction: "加筆してください",
        conversation: [
          {
            role: "user",
            content: "HonoでSlidevライクなスライドを作ったことをテーマにスライドに加筆してください。",
          },
          {
            role: "assistant",
            content: "加筆する編集案を作れます。",
          },
        ],
        baseMarkdownHash: createDeckMarkdownHashForTest(markdown),
      }),
    ).rejects.toThrow("Code Mode did not produce a usable edit proposal.");
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
      message: "Tighten the title",
      proposal: {
        type: "patch",
        baseMarkdownHash: "mdx-b5765d09",
        summary: "Tighten the title",
      },
    });
    expect(generateCodeModeResult).toHaveBeenCalledWith(testEnv(), { ...chatInput, mode: "code" });
  });

  it("normalizes Code Mode proposal responses so chat text follows the proposal summary", async () => {
    const generateCodeModeResult = vi.fn().mockResolvedValue({
      source: "workers-ai-codemode",
      suggestion: "スライドの主張を1つにし、箇条書きは3点以内にまとめましょう。",
      proposal: {
        type: "patch",
        baseMarkdownHash: "mdx-b5765d09",
        summary: "HonoでSlidevライクなスライド制作の背景を加筆します。",
        patches: [
          {
            path: "decks/deck1/deck.mdx",
            oldText: "# Raw Deck",
            newText: "# Raw Deck\n\nHonoでSlidevライクなスライド制作の背景を加筆します。",
          },
        ],
      },
    });

    await expect(
      buildChatResult(testEnv(), { ...chatInput, mode: "code" }, { generateCodeModeResult }),
    ).resolves.toMatchObject({
      source: "workers-ai-codemode",
      message: "HonoでSlidevライクなスライド制作の背景を加筆します。",
      proposal: {
        type: "patch",
        summary: "HonoでSlidevライクなスライド制作の背景を加筆します。",
      },
    });
    await expect(
      buildChatResult(testEnv(), { ...chatInput, mode: "code" }, { generateCodeModeResult }),
    ).resolves.not.toHaveProperty("suggestion");
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
    ).rejects.toThrow("Code Mode did not produce a usable edit proposal.");
  });

  it("falls back when code mode returns no edit proposal", async () => {
    const generateCodeModeResult = vi.fn().mockResolvedValue({
      source: "workers-ai-codemode",
      message: "No concrete edits.",
    });

    await expect(
      buildChatResult(testEnv(), { ...chatInput, mode: "code" }, { generateCodeModeResult }),
    ).rejects.toThrow("Code Mode did not produce a usable edit proposal.");
  });

  it("does not mix generic advice into edit errors", async () => {
    const run = vi.fn().mockResolvedValue({
      response: "スライドの内容を充実させるために、各スライドの主張を1つにし、箇条書きは3点以内にまとめましょう。",
    });
    const markdown = "# Hono Slides\n\nCloudflare Workers で動く Slidev-like deck";
    const generateCodeModeResult = vi.fn().mockResolvedValue(undefined);

    await expect(
      buildChatResult(
        {
          AI: { run },
        } as unknown as Env,
        {
          ...chatInput,
          mode: "code",
          markdown,
          instruction: "HonoでSlidevライクなスライドを作ったことをテーマに加筆してください",
          baseMarkdownHash: createDeckMarkdownHashForTest(markdown),
        },
        { generateCodeModeResult },
      ),
    ).rejects.toThrow("Code Mode did not produce a usable edit proposal.");

    expect(run).not.toHaveBeenCalled();
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
    ).rejects.toThrow("Code Mode did not produce a usable edit proposal.");
  });

  it("falls back to the local code proposal when code mode generation fails", async () => {
    const generateCodeModeResult = vi.fn().mockRejectedValue(new Error("model unavailable"));

    await expect(
      buildChatResult(testEnv(), { ...chatInput, mode: "code" }, { generateCodeModeResult }),
    ).rejects.toThrow("Code Mode did not produce a usable edit proposal.");
  });

  it("returns JSON errors for POST /chat when no proposal can be generated", async () => {
    const agent = Object.create(SlideAssistant.prototype) as SlideAssistantInstance & {
      env: Env;
      state: { revisionCount: number };
      setState(state: { lastInstruction?: string; revisionCount: number }): void;
    };
    agent.env = testEnv();
    agent.state = { revisionCount: 0 };
    agent.setState = (state: { lastInstruction?: string; revisionCount: number }) => {
      agent.state = { revisionCount: state.revisionCount };
    };

    const response = await agent.onRequest(
      new Request("https://example.test/agents/slide-assistant/deck1/chat", {
        method: "POST",
        body: JSON.stringify({ ...chatInput, mode: "code" }),
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: "Code Mode did not produce a usable edit proposal.",
    });
    expect(agent.state.revisionCount).toBe(0);
  });

  it("does not persist fake assistant turns when JSON chat returns an error", async () => {
    const agent = Object.create(SlideAssistant.prototype) as SlideAssistantInstance & {
      env: Env;
      state: { revisionCount: number; recentTurns?: Array<{ role: "user" | "assistant"; content: string }> };
      setState(state: { revisionCount: number; recentTurns?: Array<{ role: "user" | "assistant"; content: string }> }): void;
    };
    const markdown = "# Hono Slides\n\nCloudflare Workers で動く Slidev-like deck";
    agent.env = testEnv();
    agent.state = { revisionCount: 0 };
    agent.setState = (state) => {
      agent.state = state;
    };

    const response = await agent.onRequest(
      new Request("https://example.test/agents/slide-assistant/deck1/chat", {
        method: "POST",
        body: JSON.stringify({
          ...chatInput,
          markdown,
          instruction: "加筆してください",
          mode: "chat",
          baseMarkdownHash: createDeckMarkdownHashForTest(markdown),
        }),
      }),
    );
    const json = (await response.json()) as { error?: string };

    expect(response.status).toBe(503);
    expect(json.error).toBe("Code Mode did not produce a usable edit proposal.");
    expect(agent.state.revisionCount).toBe(0);
    expect(agent.state.recentTurns).toBeUndefined();
  });

  it("returns an error for greetings when Workers AI is unavailable", async () => {
    const agent = Object.create(SlideAssistant.prototype) as SlideAssistantInstance & {
      env: Env;
      state: { revisionCount: number; recentTurns?: Array<{ role: "user" | "assistant"; content: string }> };
      setState(state: { revisionCount: number; recentTurns?: Array<{ role: "user" | "assistant"; content: string }> }): void;
    };
    agent.env = testEnv();
    agent.state = {
      revisionCount: 1,
      recentTurns: [
        {
          role: "user",
          content: "全ページを確認してスライドの内容を充実させてください",
        },
        {
          role: "assistant",
          content: "編集 proposal を作成できます。",
        },
      ],
    };
    agent.setState = (state) => {
      agent.state = state;
    };

    const response = await agent.onRequest(
      new Request("https://example.test/agents/slide-assistant/deck1/chat", {
        method: "POST",
        body: JSON.stringify({
          ...chatInput,
          instruction: "hello",
          mode: "chat",
        }),
      }),
    );
    const json = (await response.json()) as { error?: string };

    expect(response.status).toBe(503);
    expect(json.error).toBe("Workers AI did not produce a usable chat response.");
    expect(agent.state.recentTurns?.map((turn) => turn.role)).toEqual(["user", "assistant"]);
  });

  it("returns an error for conversational repair turns when Workers AI is unavailable", async () => {
    const agent = Object.create(SlideAssistant.prototype) as SlideAssistantInstance & {
      env: Env;
      state: { revisionCount: number; recentTurns?: Array<{ role: "user" | "assistant"; content: string }> };
      setState(state: { revisionCount: number; recentTurns?: Array<{ role: "user" | "assistant"; content: string }> }): void;
    };
    agent.env = testEnv();
    agent.state = {
      revisionCount: 2,
      recentTurns: [
        { role: "user", content: "Deck全体を再構成できますか？" },
        {
          role: "assistant",
          content: "デック全体を対象に、構成案を一緒に見直せます。",
        },
        { role: "user", content: "話聞いてる？" },
        { role: "assistant", content: "聞いています。" },
      ],
    };
    agent.setState = (state) => {
      agent.state = state;
    };

    const response = await agent.onRequest(
      new Request("https://example.test/agents/slide-assistant/deck1/chat", {
        method: "POST",
        body: JSON.stringify({
          ...chatInput,
          instruction: "そういうことじゃないです。",
          mode: "chat",
          useWorkersAI: false,
        }),
      }),
    );
    const json = (await response.json()) as { error?: string };

    expect(response.status).toBe(503);
    expect(json.error).toBe("Workers AI did not produce a usable chat response.");
  });

  it("returns an error for attention checks when Workers AI is unavailable", async () => {
    await expect(
      buildChatResult(testEnv(), {
        ...chatInput,
        instruction: "おーい",
        mode: "chat",
        useWorkersAI: false,
      }),
    ).rejects.toThrow("Workers AI did not produce a usable chat response.");
  });

  it("returns an error for deck consultation when Workers AI is unavailable", async () => {
    await expect(
      buildChatResult(testEnv(), {
        ...chatInput,
        instruction: "Deck全体を再構成できますか？",
        mode: "chat",
        slideCount: 3,
        useWorkersAI: false,
      }),
    ).rejects.toThrow("Workers AI did not produce a usable chat response.");
  });

  it("returns an AIChatAgent error response without Workers AI", async () => {
    const agent = Object.create(SlideAssistant.prototype) as SlideAssistantInstance & {
      env: Env;
      messages: Array<{ id: string; role: "user"; parts: Array<{ type: "text"; text: string }> }>;
    };
    agent.env = testEnv();
    agent.messages = [{ id: "user-1", role: "user", parts: [{ type: "text", text: "こんにちは" }] }];

    const response = await agent.onChatMessage(vi.fn() as never, {
      body: {
        slug: "deck1",
        sessionId: "session-1",
        markdown: "# Raw Deck",
        mode: "chat",
        slideCount: 1,
      },
    });

    expect(response?.status).toBe(503);
    await expect(response?.json()).resolves.toEqual({ error: "Workers AI binding is required for chat responses." });
  });

  it("returns an error from suggestion helper without Workers AI", async () => {
    await expect(
      buildSuggestion(testEnv(), { markdown: "# Raw Deck", instruction: "Improve this", activeSlide: 0 }),
    ).rejects.toThrow("Workers AI did not produce a usable chat response.");
  });

  it("returns an error for greetings without Workers AI", async () => {
    await expect(
      buildSuggestion(testEnv(), {
        markdown: "# Raw Deck",
        instruction: "こんにちは",
        activeSlide: 0,
        slideCount: 1,
        mode: "chat",
      }),
    ).rejects.toThrow("Workers AI did not produce a usable chat response.");
  });

  it("returns an error when Workers AI requires remote execution", async () => {
    await expect(
      buildSuggestion(
        {
          AI: {
            run: async () => {
              throw new Error("Binding AI needs to be run remotely");
            },
          },
        } as unknown as Env,
        { markdown: "# Raw Deck", instruction: "Improve this", activeSlide: 0, slideCount: 1 },
      ),
    ).rejects.toThrow("Workers AI did not produce a usable chat response.");
  });

  it("returns an error when the request disables Workers AI", async () => {
    const run = vi.fn();

    await expect(
      buildSuggestion(
        {
          AI: { run },
        } as unknown as Env,
        { markdown: "# Raw Deck", instruction: "Improve this", activeSlide: 0, slideCount: 1, useWorkersAI: false },
      ),
    ).rejects.toThrow("Workers AI did not produce a usable chat response.");
    expect(run).not.toHaveBeenCalled();
  });

  it("asks Workers AI for short Japanese advice without rewriting the deck", async () => {
    const run = vi.fn().mockResolvedValue({ response: "見出しを短くし、各スライドの主張を1つに絞ると読みやすくなります。" });

    await expect(
      buildSuggestion(
        {
          AI: { run },
        } as unknown as Env,
        { markdown: "# Raw Deck\n\n<Hero title=\"MDX-like components\" />", instruction: "Improve this", activeSlide: 0, slideCount: 1 },
      ),
    ).resolves.toMatchObject({
      source: "workers-ai",
      suggestion: "見出しを短くし、各スライドの主張を1つに絞ると読みやすくなります。",
    });

    expect(run).toHaveBeenCalledWith(
      "@cf/meta/llama-3.1-8b-instruct",
      expect.objectContaining({
        messages: [
          expect.objectContaining({
            role: "system",
            content: expect.stringContaining("日本語だけ"),
          }),
          expect.objectContaining({
            role: "user",
            content: expect.stringContaining("Markdown全体を書き換えない"),
          }),
        ],
      }),
    );
    expect(run.mock.calls[0][1].messages[0].content).toContain("MDXタグ");
    expect(run.mock.calls[0][1].messages[0].content).toContain("3文以内");
  });

  it("asks Workers AI to handle non-greeting chat messages as conversation", async () => {
    const run = vi.fn().mockResolvedValue({ response: "構成は、導入、編集体験、次のアクションの順にすると伝わりやすくなります。" });

    await expect(
      buildSuggestion(
        {
          AI: { run },
        } as unknown as Env,
        { markdown: "# Raw Deck", instruction: "構成を相談したい", activeSlide: 0, slideCount: 1, mode: "chat" },
      ),
    ).resolves.toMatchObject({
      source: "workers-ai",
      suggestion: "構成は、導入、編集体験、次のアクションの順にすると伝わりやすくなります。",
    });

    expect(run.mock.calls[0][1].messages[0].content).toContain("挨拶");
    expect(run.mock.calls[0][1].messages[0].content).toContain("通常の会話");
    expect(run.mock.calls[0][1].messages[1].content).toContain("ユーザー入力: 構成を相談したい");
  });

  it("does not answer greetings locally before Workers AI", async () => {
    const run = vi.fn();

    await expect(
      buildSuggestion(
        {
          AI: { run },
        } as unknown as Env,
        {
          markdown: "# Raw Deck",
          instruction: "hello",
          activeSlide: 0,
          slideCount: 1,
          mode: "chat",
          conversation: [
            {
              role: "user",
              content: "全ページを確認してスライドの内容を充実させてください",
            },
          ],
        },
      ),
    ).rejects.toThrow("Workers AI did not produce a usable chat response.");
    expect(run).toHaveBeenCalled();
  });

  it("returns an error when Workers AI returns a deck rewrite instead of advice", async () => {
    await expect(
      buildSuggestion(
        {
          AI: {
            run: async () => ({
              response:
                "```markdown\n---\ntitle: Table of Contents\n---\n\n# Hono Slides\n\n<ero title=\"MDX-like components\" />\n```",
            }),
          },
        } as unknown as Env,
        {
          markdown: '# Hono Slides\n\n<Hero title="MDX-like components" />',
          instruction: "Improve this",
          activeSlide: 0,
          slideCount: 1,
        },
      ),
    ).rejects.toThrow("Workers AI did not produce a usable chat response.");
  });

  it("returns an error when Workers AI ignores provided markdown and says the content is unspecified", async () => {
    await expect(
      buildSuggestion(
        {
          AI: {
            run: async () => ({
              response: "スライドの内容は未指定なので、編集案を提示することはできません。スライドの内容を教えてください。",
            }),
          },
        } as unknown as Env,
        {
          markdown: "# Hono Slides\n\nCloudflare Workers で動く Slidev-like deck",
          instruction: "編集案を提示してください",
          activeSlide: 0,
          slideCount: 1,
          mode: "chat",
        },
      ),
    ).rejects.toThrow("Workers AI did not produce a usable chat response.");
  });

  it("returns an error when Workers AI does not respond", async () => {
    vi.useFakeTimers();
    try {
      const result = buildSuggestion(
        {
          AI: {
            run: async () => new Promise(() => undefined),
          },
        } as unknown as Env,
        { markdown: "# Raw Deck", instruction: "Improve this", activeSlide: 0, slideCount: 1 },
      );
      const assertion = expect(result).rejects.toThrow("Workers AI did not produce a usable chat response.");

      const timers = vi as typeof vi & { advanceTimersByTimeAsync?: (milliseconds: number) => Promise<void> };
      if (timers.advanceTimersByTimeAsync) {
        await timers.advanceTimersByTimeAsync(8_000);
      } else {
        vi.advanceTimersByTime(8_000);
        await Promise.resolve();
      }

      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });
});

function testEnv(): Env {
  return {} as Env;
}

function createDeckMarkdownHashForTest(markdown: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < markdown.length; index += 1) {
    hash ^= markdown.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `mdx-${(hash >>> 0).toString(16)}`;
}
