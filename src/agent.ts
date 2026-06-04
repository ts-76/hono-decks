import { Agent } from "agents";
import { applyDeckAgentProposal } from "./agent-apply";
import { createDeckMarkdownHash } from "./agent-contract";
import type { DeckAgentChatResult } from "./agent-contract";
import type { HonoSlidesAgentChatInput } from "./router";
import type { AgentSuggestRequest, AgentSuggestResponse, Env } from "./types";
import type { WorkersAI } from "workers-ai-provider";

export interface BuildChatResultOptions {
  generateCodeModeResult?: CodeModeResultGenerator;
}

export type CodeModeResultGenerator = (
  env: Env,
  payload: HonoSlidesAgentChatInput,
) => Promise<DeckAgentChatResult | undefined>;

interface AssistantState {
  lastInstruction?: string;
  revisionCount: number;
}

export class SlideAssistant extends Agent<Env, AssistantState> {
  initialState = { revisionCount: 0 } satisfies AssistantState;

  async onRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname.endsWith("/suggest")) {
      const payload = (await request.json()) as AgentSuggestRequest;
      const response = await buildSuggestion(this.env, payload);
      this.setState({
        lastInstruction: payload.instruction,
        revisionCount: (this.state?.revisionCount ?? 0) + 1,
      });
      return Response.json(response);
    }

    if (request.method === "POST" && url.pathname.endsWith("/chat")) {
      const payload = (await request.json()) as HonoSlidesAgentChatInput;
      const response = await buildChatResult(this.env, payload);
      this.setState({
        lastInstruction: payload.instruction,
        revisionCount: (this.state?.revisionCount ?? 0) + 1,
      });
      return Response.json(response);
    }

    return Response.json(
      {
        ok: true,
        message: "POST /suggest with { markdown, instruction, activeSlide } to get editing help.",
        state: this.state,
      },
      { status: 200 },
    );
  }
}

export async function buildChatResult(
  env: Env,
  payload: HonoSlidesAgentChatInput,
  options: BuildChatResultOptions = {},
): Promise<DeckAgentChatResult> {
  const suggestion = await buildSuggestion(env, payload);
  if (payload.mode !== "code") return suggestion;

  const generateCodeModeResult = options.generateCodeModeResult ?? generateWithWorkersAICodeMode;
  try {
    const codeModeResult = await generateCodeModeResult(env, payload);
    if (codeModeResult && isUsableCodeModeResult(codeModeResult, payload)) return codeModeResult;
  } catch {
    // Code Mode is a best-effort assistant path. Saving still happens through Hono apply/save routes.
  }

  const instruction = payload.instruction || "読みやすくする";
  return {
    source: suggestion.source,
    message: "編集 proposal を作成しました。保存は Hono の apply/save route で行ってください。",
    suggestion: suggestion.suggestion,
    proposal: {
      type: "patch",
      baseMarkdownHash: payload.baseMarkdownHash || createDeckMarkdownHash(payload.markdown),
      summary: instruction,
      patches: [
        {
          path: expectedSourcePath(payload),
          oldText: payload.markdown,
          newText: `${payload.markdown}\n\n<!-- ${instruction} -->`,
        },
      ],
    },
  };
}

function isUsableCodeModeResult(result: DeckAgentChatResult, payload: HonoSlidesAgentChatInput): boolean {
  if (!result.proposal) return false;
  return applyDeckAgentProposal(payload.markdown, result.proposal, { sourcePath: expectedSourcePath(payload) }).ok;
}

function expectedSourcePath(payload: Pick<HonoSlidesAgentChatInput, "slug" | "sourcePath">): string {
  return payload.sourcePath ?? `decks/${payload.slug}.mdx`;
}

export async function buildSuggestion(env: Env, payload: AgentSuggestRequest): Promise<AgentSuggestResponse> {
  const aiSuggestion = await suggestWithWorkersAI(env, payload);
  if (aiSuggestion) return aiSuggestion;

  const slideCount = payload.markdown.split(/^---\s*$/m).filter((part) => part.trim()).length;
  const focus = payload.activeSlide != null ? `現在のスライド ${payload.activeSlide + 1}` : "デック全体";
  return {
    source: "heuristic",
    suggestion: `${focus}を対象に「${payload.instruction || "読みやすくする"}」方針で見直せます。まず見出しを1行に絞り、箇条書きは3点以内、各スライドの主張を1つにすると Slidev 風に扱いやすいです。現在 ${slideCount} 枚のスライドがあります。`,
  };
}

async function suggestWithWorkersAI(env: Env, payload: AgentSuggestRequest): Promise<AgentSuggestResponse | undefined> {
  if (!env.AI) return undefined;

  const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    messages: [
      {
        role: "system",
        content:
          "You are a concise Japanese slide editor. Return one practical suggestion for improving a Markdown/MDX slide deck.",
      },
      {
        role: "user",
        content: JSON.stringify({
          instruction: payload.instruction,
          activeSlide: payload.activeSlide,
          markdown: payload.markdown.slice(0, 6000),
        }),
      },
    ],
  });

  const response = typeof result === "object" && result !== null && "response" in result ? String(result.response) : undefined;
  if (!response) return undefined;
  return { source: "workers-ai", suggestion: response };
}

async function generateWithWorkersAICodeMode(
  env: Env,
  payload: HonoSlidesAgentChatInput,
): Promise<DeckAgentChatResult | undefined> {
  if (!env.AI || !env.LOADER) return undefined;

  const [{ generateText, stepCountIs }, { createDeckCodeModeTool }] = await Promise.all([
    import("ai"),
    import("./agent-codemode"),
  ]);
  const workersai = await createWorkersAIModel(env);
  if (!workersai) return undefined;

  const codemode = await createDeckCodeModeTool({
    slug: payload.slug,
    markdown: payload.markdown,
    sourcePath: payload.sourcePath,
    loader: env.LOADER,
  });
  const result = await generateText({
    model: workersai("@cf/meta/llama-3.1-8b-instruct"),
    tools: { codemode },
    stopWhen: stepCountIs(2),
    system:
      "You edit MDX slide decks. Use Code Mode when a concrete edit is useful. Return only a JSON DeckAgentChatResult.",
    prompt: JSON.stringify({
      task: "Create a non-persistent edit proposal for this deck. Do not save files.",
      instruction: payload.instruction,
      slug: payload.slug,
      sourcePath: payload.sourcePath,
      activeSlide: payload.activeSlide,
      baseMarkdownHash: payload.baseMarkdownHash || createDeckMarkdownHash(payload.markdown),
      expectedJsonShape: {
        source: "workers-ai-codemode",
        message: "short Japanese message",
        proposal: {
          type: "patch",
          baseMarkdownHash: "same hash",
          summary: "short summary",
          patches: [{ path: "sourcePath", oldText: "exact old text", newText: "replacement text" }],
        },
      },
    }),
  });

  return parseDeckAgentChatResult(result.text);
}

async function createWorkersAIModel(env: Env): Promise<WorkersAI | undefined> {
  const provider = await import("workers-ai-provider");
  return provider.createWorkersAI?.({ binding: env.AI as NonNullable<Env["AI"]> });
}

function parseDeckAgentChatResult(text: string): DeckAgentChatResult | undefined {
  const json = extractJsonObject(text);
  if (!json) return undefined;

  try {
    const value = JSON.parse(json) as Partial<DeckAgentChatResult>;
    if (typeof value !== "object" || value === null) return undefined;
    if (typeof value.source !== "string") return undefined;
    return {
      source: value.source,
      ...(typeof value.message === "string" ? { message: value.message } : {}),
      ...(typeof value.suggestion === "string" ? { suggestion: value.suggestion } : {}),
      ...(value.proposal ? { proposal: value.proposal } : {}),
    };
  } catch {
    return undefined;
  }
}

function extractJsonObject(text: string): string | undefined {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;

  const fenced = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/.exec(trimmed);
  if (fenced) return fenced[1];

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  return start >= 0 && end > start ? trimmed.slice(start, end + 1) : undefined;
}
