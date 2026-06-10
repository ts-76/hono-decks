import { describe, expect, it } from "vitest";
import { parseCodeModeGenerationResult } from "../src/agent-codemode-result";

const proposal = {
  type: "patch",
  baseMarkdownHash: "mdx-b5765d09",
  summary: "タイトルを変更します。",
  patches: [
    {
      path: "decks/deck1/deck.mdx",
      oldText: "# Raw Deck",
      newText: "# Sharper Deck",
    },
  ],
};

describe("parseCodeModeGenerationResult", () => {
  it("parses a final text JSON DeckAgentChatResult", () => {
    expect(
      parseCodeModeGenerationResult({
        text: JSON.stringify({
          source: "workers-ai-codemode",
          message: "Ready",
          proposal,
        }),
        toolResults: [],
        steps: [],
      }),
    ).toMatchObject({
      source: "workers-ai-codemode",
      message: "タイトルを変更します。",
      proposal,
    });
  });

  it("extracts a proposal returned by the final Code Mode tool output", () => {
    expect(
      parseCodeModeGenerationResult({
        text: "",
        toolResults: [
          {
            type: "tool-result",
            toolName: "codemode",
            output: {
              result: proposal,
              logs: [],
            },
          },
        ],
        steps: [],
      }),
    ).toMatchObject({
      source: "workers-ai-codemode",
      message: "タイトルを変更します。",
      proposal,
    });
  });

  it("extracts a proposal from an earlier generation step", () => {
    expect(
      parseCodeModeGenerationResult({
        text: "",
        toolResults: [],
        steps: [
          {
            text: "",
            toolResults: [
              {
                type: "tool-result",
                toolName: "codemode",
                output: {
                  result: proposal,
                },
              },
            ],
          },
          { text: "編集 proposal を作成しました。", toolResults: [] },
        ],
      }),
    ).toMatchObject({
      source: "workers-ai-codemode",
      message: "タイトルを変更します。",
      proposal,
    });
  });

  it("ignores plain advice without a proposal", () => {
    expect(parseCodeModeGenerationResult({ text: "箇条書きを短くしましょう。", toolResults: [], steps: [] })).toBeUndefined();
  });
});
