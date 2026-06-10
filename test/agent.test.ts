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
  it("builds a chat result for normal chat mode", async () => {
    await expect(buildChatResult(testEnv(), chatInput)).resolves.toMatchObject({
      source: "heuristic",
      suggestion: expect.stringContaining("Improve this"),
    });
  });

  it("does not invent a local patch when code mode lacks a concrete edit target", async () => {
    await expect(buildChatResult(testEnv(), { ...chatInput, mode: "code" })).resolves.toMatchObject({
      source: "heuristic",
      message: "具体的な編集 proposal は作成できませんでした。変更したい箇所や文言をもう少し具体的に指定してください。",
      suggestion: expect.stringContaining("Improve this"),
    });
    await expect(buildChatResult(testEnv(), { ...chatInput, mode: "code" })).resolves.not.toHaveProperty("proposal");
  });

  it("builds a visible title patch for title edit requests when code mode falls back locally", async () => {
    await expect(
      buildChatResult(testEnv(), {
        ...chatInput,
        mode: "code",
        markdown: "# Hono Slides\n\nCloudflare Workers で動く Slidev-like deck",
        instruction: "タイトルを変更してみて",
        baseMarkdownHash: createDeckMarkdownHashForTest("# Hono Slides\n\nCloudflare Workers で動く Slidev-like deck"),
      }),
    ).resolves.toMatchObject({
      source: "heuristic",
      message: "編集 proposal を作成しました。保存は Hono の apply/save route で行ってください。",
      proposal: {
        type: "patch",
        patches: [
          {
            oldText: "# Hono Slides",
            newText: "# Hono Slides の概要",
          },
        ],
      },
    });
  });

  it("builds a visible content patch for generic edit proposal requests", async () => {
    const markdown = "# Hono Slides\n\nCloudflare Workers で動く Slidev-like deck";

    await expect(
      buildChatResult(testEnv(), {
        ...chatInput,
        mode: "chat",
        markdown,
        instruction: "編集案を提示してください",
        baseMarkdownHash: createDeckMarkdownHashForTest(markdown),
      }),
    ).resolves.toMatchObject({
      source: "heuristic",
      message: "編集 proposal を作成しました。保存は Hono の apply/save route で行ってください。",
      proposal: {
        type: "patch",
        patches: [
          {
            oldText: "# Hono Slides",
            newText: expect.stringContaining("このスライドで伝えたいこと"),
          },
        ],
      },
    });
  });

  it("uses recent conversation context for vague follow-up edit requests", async () => {
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
    ).resolves.toMatchObject({
      source: "heuristic",
      message: "編集 proposal を作成しました。保存は Hono の apply/save route で行ってください。",
      proposal: {
        type: "patch",
        patches: [
          {
            oldText: "# Hono Slides",
            newText: expect.stringContaining("HonoでSlidevライク"),
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
      message: "具体的な編集 proposal は作成できませんでした。変更したい箇所や文言をもう少し具体的に指定してください。",
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
      message: "具体的な編集 proposal は作成できませんでした。変更したい箇所や文言をもう少し具体的に指定してください。",
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
      message: "具体的な編集 proposal は作成できませんでした。変更したい箇所や文言をもう少し具体的に指定してください。",
    });
  });

  it("falls back to the local code proposal when code mode generation fails", async () => {
    const generateCodeModeResult = vi.fn().mockRejectedValue(new Error("model unavailable"));

    await expect(
      buildChatResult(testEnv(), { ...chatInput, mode: "code" }, { generateCodeModeResult }),
    ).resolves.toMatchObject({
      source: "heuristic",
      message: "具体的な編集 proposal は作成できませんでした。変更したい箇所や文言をもう少し具体的に指定してください。",
    });
  });

  it("handles POST /chat requests", async () => {
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

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      source: "heuristic",
      message: "具体的な編集 proposal は作成できませんでした。変更したい箇所や文言をもう少し具体的に指定してください。",
    });
    expect(agent.state.revisionCount).toBe(1);
  });

  it("persists recent JSON chat turns in Durable Object state for follow-up edits", async () => {
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

    await agent.onRequest(
      new Request("https://example.test/agents/slide-assistant/deck1/chat", {
        method: "POST",
        body: JSON.stringify({
          ...chatInput,
          markdown,
          instruction: "HonoでSlidevライクなスライドを作ったことをテーマにスライドに加筆してください。",
          mode: "chat",
          baseMarkdownHash: createDeckMarkdownHashForTest(markdown),
        }),
      }),
    );
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
    const json = (await response.json()) as {
      proposal?: { patches?: Array<{ newText: string }> };
    };

    expect(agent.state.revisionCount).toBe(2);
    expect(agent.state.recentTurns?.map((turn) => turn.role)).toEqual(["user", "assistant", "user", "assistant"]);
    expect(json.proposal?.patches?.[0]?.newText).toContain("HonoでSlidevライク");
  });

  it("handles AIChatAgent chat turns without Workers AI", async () => {
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

    expect(response?.status).toBe(200);
    await expect(response?.text()).resolves.toContain("こんにちは");
  });

  it("keeps the legacy suggestion helper working", async () => {
    await expect(
      buildSuggestion(testEnv(), { markdown: "# Raw Deck", instruction: "Improve this", activeSlide: 0 }),
    ).resolves.toMatchObject({
      source: "heuristic",
      suggestion: expect.stringContaining("Improve this"),
    });
  });

  it("answers greetings conversationally in chat mode without Workers AI", async () => {
    await expect(
      buildSuggestion(testEnv(), {
        markdown: "# Raw Deck",
        instruction: "こんにちは",
        activeSlide: 0,
        slideCount: 1,
        mode: "chat",
      }),
    ).resolves.toMatchObject({
      source: "heuristic",
      suggestion: expect.stringContaining("こんにちは"),
    });
  });

  it("falls back when Workers AI requires remote execution", async () => {
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
    ).resolves.toMatchObject({
      source: "heuristic",
      suggestion: expect.stringContaining("現在 1 枚"),
    });
  });

  it("does not start Workers AI when the request disables it", async () => {
    const run = vi.fn();

    await expect(
      buildSuggestion(
        {
          AI: { run },
        } as unknown as Env,
        { markdown: "# Raw Deck", instruction: "Improve this", activeSlide: 0, slideCount: 1, useWorkersAI: false },
      ),
    ).resolves.toMatchObject({
      source: "heuristic",
      suggestion: expect.stringContaining("現在 1 枚"),
    });
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

  it("asks Workers AI to handle normal chat messages as conversation", async () => {
    const run = vi.fn().mockResolvedValue({ response: "こんにちは。スライドの構成や文章の見直しを手伝えます。" });

    await expect(
      buildSuggestion(
        {
          AI: { run },
        } as unknown as Env,
        { markdown: "# Raw Deck", instruction: "こんにちは", activeSlide: 0, slideCount: 1, mode: "chat" },
      ),
    ).resolves.toMatchObject({
      source: "workers-ai",
      suggestion: "こんにちは。スライドの構成や文章の見直しを手伝えます。",
    });

    expect(run.mock.calls[0][1].messages[0].content).toContain("挨拶");
    expect(run.mock.calls[0][1].messages[0].content).toContain("通常の会話");
    expect(run.mock.calls[0][1].messages[1].content).toContain("ユーザー入力: こんにちは");
  });

  it("falls back when Workers AI returns a deck rewrite instead of advice", async () => {
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
    ).resolves.toMatchObject({
      source: "heuristic",
      suggestion: expect.stringContaining("現在 1 枚"),
    });
  });

  it("falls back when Workers AI ignores provided markdown and says the content is unspecified", async () => {
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
    ).resolves.toMatchObject({
      source: "heuristic",
      suggestion: expect.stringContaining("現在 1 枚"),
    });
  });

  it("falls back when Workers AI does not respond", async () => {
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

      const timers = vi as typeof vi & { advanceTimersByTimeAsync?: (milliseconds: number) => Promise<void> };
      if (timers.advanceTimersByTimeAsync) {
        await timers.advanceTimersByTimeAsync(8_000);
      } else {
        vi.advanceTimersByTime(8_000);
        await Promise.resolve();
      }

      await expect(result).resolves.toMatchObject({
        source: "heuristic",
        suggestion: expect.stringContaining("現在 1 枚"),
      });
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
