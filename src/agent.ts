import { AIChatAgent } from "@cloudflare/ai-chat";
import { applyDeckAgentProposal } from "./agent-apply";
import { createDeckMarkdownHash } from "./agent-contract";
import type { DeckAgentChatResult, DeckAgentChatTurn } from "./agent-contract";
import { resolveDeckAgentMode } from "./agent-intent";
import type { HonoSlidesAgentChatInput } from "./router";
import type { AgentSuggestRequest, AgentSuggestResponse, Env } from "./types";
import { convertToModelMessages, stepCountIs, streamText, tool } from "ai";
import type { StreamTextOnFinishCallback, ToolSet, UIMessage } from "ai";
import type { WorkersAI } from "workers-ai-provider";
import { z } from "zod";

export interface BuildChatResultOptions {
  generateCodeModeResult?: CodeModeResultGenerator;
  codeModeTimeoutMs?: number;
}

export type CodeModeResultGenerator = (
  env: Env,
  payload: HonoSlidesAgentChatInput,
) => Promise<DeckAgentChatResult | undefined>;

export class AgentResponseError extends Error {
  constructor(
    message: string,
    readonly status = 503,
  ) {
    super(message);
    this.name = "AgentResponseError";
  }
}

interface AssistantState {
  lastInstruction?: string;
  recentTurns?: DeckAgentChatTurn[];
  revisionCount: number;
}

const maxRecentTurns = 12;

export class SlideAssistant extends AIChatAgent<Env, AssistantState> {
  initialState = { revisionCount: 0 } satisfies AssistantState;
  maxPersistedMessages = 100;
  messageConcurrency = "latest" as const;

  async onChatMessage(
    onFinish: StreamTextOnFinishCallback<ToolSet>,
    options?: { abortSignal?: AbortSignal; body?: Record<string, unknown> },
  ): Promise<Response | undefined> {
    const payload = createChatPayloadFromMessages(this.messages, options?.body);
    const workersai = await createWorkersAIModel(this.env);
    if (!workersai) {
      return createAgentErrorResponse(new AgentResponseError("Workers AI binding is required for chat responses."));
    }

    const tools = createChatAgentTools(payload);
    const result = streamText({
      model: workersai("@cf/meta/llama-3.1-8b-instruct"),
      system: createChatAgentSystemPrompt(payload),
      messages: await convertToModelMessages(this.messages),
      tools,
      stopWhen: stepCountIs(5),
      abortSignal: options?.abortSignal,
      onFinish: onFinish as unknown as StreamTextOnFinishCallback<typeof tools>,
    });

    return result.toUIMessageStreamResponse();
  }

  async onRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname.endsWith("/suggest")) {
      const payload = (await request.json()) as AgentSuggestRequest;
      try {
        const response = await buildSuggestion(this.env, payload);
        this.setState({
          lastInstruction: payload.instruction,
          revisionCount: (this.state?.revisionCount ?? 0) + 1,
        });
        return Response.json(response);
      } catch (error) {
        return createAgentErrorResponse(error);
      }
    }

    if (request.method === "POST" && url.pathname.endsWith("/chat")) {
      const payload = (await request.json()) as HonoSlidesAgentChatInput;
      const contextualPayload = withStateConversation(payload, this.state);
      try {
        const response = await buildChatResult(this.env, contextualPayload);
        this.setState({
          lastInstruction: payload.instruction,
          recentTurns: appendRecentTurns(this.state?.recentTurns, payload.instruction, response),
          revisionCount: (this.state?.revisionCount ?? 0) + 1,
        });
        return Response.json(response);
      } catch (error) {
        return createAgentErrorResponse(error);
      }
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

function createChatPayloadFromMessages(
  messages: UIMessage[],
  body: Record<string, unknown> | undefined,
): HonoSlidesAgentChatInput {
  const latestUserText = [...messages]
    .reverse()
    .find((message) => message.role === "user")
    ?.parts.map((part) => ("text" in part && typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();

  const markdown = readString(body, "markdown") ?? "";
  const slug = readString(body, "slug") ?? "deck";
  const sessionId = readString(body, "sessionId") ?? "default";
  return {
    slug,
    sessionId,
    agentInstanceName: readString(body, "agentInstanceName") ?? `deck-${slug}-session-${sessionId}`,
    mode: resolveDeckAgentMode(readString(body, "mode"), latestUserText || readString(body, "instruction") || ""),
    markdown,
    instruction: latestUserText || readString(body, "instruction") || "",
    baseMarkdownHash: readString(body, "baseMarkdownHash") ?? createDeckMarkdownHash(markdown),
    sourcePath: readString(body, "sourcePath"),
    activeSlide: readNumber(body, "activeSlide"),
    slideCount: readNumber(body, "slideCount"),
    useWorkersAI: readBoolean(body, "useWorkersAI"),
  };
}

function createChatAgentSystemPrompt(payload: HonoSlidesAgentChatInput): string {
  return [
    "あなたは Hono Slides のチャットエージェントです。日本語で短く、具体的に返してください。",
    "通常の相談には会話として返してください。編集が必要な場合は、本文を直接保存せず、必ず requestEditProposalApproval tool で proposal を提示してください。",
    "proposal は現在の raw MDX に存在する exact oldText を使い、対象 path と baseMarkdownHash を保ってください。",
    "永続化はブラウザの承認後に Hono /apply route が行います。Agent は保存しません。",
    `slug: ${payload.slug}`,
    `sourcePath: ${payload.sourcePath ?? `decks/${payload.slug}.mdx`}`,
    `baseMarkdownHash: ${payload.baseMarkdownHash ?? createDeckMarkdownHash(payload.markdown)}`,
    `activeSlide: ${payload.activeSlide ?? "unknown"}`,
    `slideCount: ${payload.slideCount ?? "unknown"}`,
    "",
    "Current raw MDX:",
    payload.markdown.slice(0, 8000),
  ].join("\n");
}

function createChatAgentTools(payload: HonoSlidesAgentChatInput) {
  const sourcePath = payload.sourcePath ?? `decks/${payload.slug}.mdx`;
  const baseMarkdownHash = payload.baseMarkdownHash ?? createDeckMarkdownHash(payload.markdown);
  return {
    requestEditProposalApproval: tool({
      description:
        "Ask the browser to show a human approval UI for a non-persistent MDX edit proposal. The browser may call Hono /apply only after the user approves.",
      inputSchema: z.object({
        summary: z.string().describe("Short Japanese summary shown to the user."),
        oldText: z.string().describe("Exact current MDX text to replace."),
        newText: z.string().describe("Replacement MDX text."),
      }),
    }),
    readCurrentDeck: tool({
      description: "Read the current raw MDX deck context. This tool never writes files.",
      inputSchema: z.object({}),
      execute: async () => ({
        slug: payload.slug,
        sourcePath,
        baseMarkdownHash,
        markdown: payload.markdown,
        activeSlide: payload.activeSlide,
        slideCount: payload.slideCount,
      }),
    }),
  };
}

export async function buildChatResult(
  env: Env,
  payload: HonoSlidesAgentChatInput,
  options: BuildChatResultOptions = {},
): Promise<DeckAgentChatResult> {
  const effectivePayload = {
    ...payload,
    mode: resolveDeckAgentMode(payload.mode, payload.instruction),
  };
  if (effectivePayload.mode !== "code") return buildSuggestion(env, effectivePayload);

  const generateCodeModeResult = options.generateCodeModeResult ?? generateWithWorkersAICodeMode;
  try {
    const codeModeResult = await resolveWithin(generateCodeModeResult(env, effectivePayload), options.codeModeTimeoutMs ?? 8_000);
    if (codeModeResult && isUsableCodeModeResult(codeModeResult, effectivePayload)) {
      return normalizeEditProposalResult(codeModeResult);
    }
  } catch {
    // Code Mode is a best-effort assistant path. Saving still happens through Hono apply/save routes.
  }

  throw new AgentResponseError("Code Mode did not produce a usable edit proposal.");
}

function normalizeEditProposalResult(result: DeckAgentChatResult): DeckAgentChatResult {
  if (!result.proposal) return result;
  const summary = result.proposal.summary || result.message || "編集 proposal を作成しました。";
  return {
    source: result.source,
    message: summary,
    proposal: {
      ...result.proposal,
      summary,
    },
  };
}

function withStateConversation(payload: HonoSlidesAgentChatInput, state: AssistantState | undefined): HonoSlidesAgentChatInput {
  const recentTurns = sanitizeRecentTurns(state?.recentTurns);
  if (recentTurns.length === 0) return payload;
  return {
    ...payload,
    conversation: recentTurns,
    mode: resolveDeckAgentMode(payload.mode, payload.instruction),
  };
}

function appendRecentTurns(
  currentTurns: DeckAgentChatTurn[] | undefined,
  instruction: string,
  response: DeckAgentChatResult,
): DeckAgentChatTurn[] {
  const nextTurns = sanitizeRecentTurns(currentTurns);
  const userContent = normalizeTurnContent(instruction);
  if (userContent) nextTurns.push({ role: "user", content: userContent });
  const assistantContent = normalizeTurnContent(response.message ?? response.suggestion ?? "");
  if (assistantContent) nextTurns.push({ role: "assistant", content: assistantContent });
  return nextTurns.slice(-maxRecentTurns);
}

function sanitizeRecentTurns(turns: DeckAgentChatTurn[] | undefined): DeckAgentChatTurn[] {
  if (!Array.isArray(turns)) return [];
  return turns
    .map((turn): DeckAgentChatTurn => ({
      role: turn.role === "assistant" ? "assistant" : "user",
      content: normalizeTurnContent(turn.content),
    }))
    .filter((turn) => turn.content)
    .slice(-maxRecentTurns);
}

function normalizeTurnContent(value: string | undefined): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, 500) : "";
}

function createContextualInstruction(payload: Pick<HonoSlidesAgentChatInput, "instruction" | "conversation">): string {
  const current = normalizeTurnContent(payload.instruction);
  const previousUser = latestPreviousUserContent(payload.conversation);
  return previousUser ? `${previousUser}\n${current}`.trim() : current;
}

function latestPreviousUserContent(turns: DeckAgentChatTurn[] | undefined): string | undefined {
  return sanitizeRecentTurns(turns)
    .filter((turn) => turn.role === "user")
    .map((turn) => turn.content)
    .at(-1);
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

  throw new AgentResponseError("Workers AI did not produce a usable chat response.");
}

async function suggestWithWorkersAI(env: Env, payload: AgentSuggestRequest): Promise<AgentSuggestResponse | undefined> {
  if (payload.useWorkersAI === false) return undefined;
  if (!env.AI) return undefined;

  let result: Awaited<ReturnType<NonNullable<Env["AI"]>["run"]>> | undefined;
  try {
    result = await resolveWithin(
      env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [
          {
            role: "system",
            content: createWorkersAISystemPrompt(payload),
          },
          {
            role: "user",
            content: createWorkersAIUserPrompt(payload),
          },
        ],
      }),
      8_000,
    );
  } catch {
    return undefined;
  }

  const response = typeof result === "object" && result !== null && "response" in result ? String(result.response) : undefined;
  if (!response) return undefined;
  const suggestion = normalizeAISuggestion(response);
  if (!isUsableAISuggestion(suggestion, payload)) return undefined;
  return { source: "workers-ai", suggestion };
}

function createWorkersAISystemPrompt(payload: AgentSuggestRequest): string {
  if (payload.mode === "chat") {
    return [
      "あなたは日本語だけで答えるスライド制作の相談相手です。",
      "通常の会話や挨拶には、自然に短く返してください。",
      "ユーザーがスライド改善を求めた場合だけ、現在のデック文脈を使って3文以内で具体的に助言してください。",
      "Markdown全体を書き換えないでください。コードブロック、frontmatter、完全なスライド案、MDXタグは出力しないでください。",
      "既存のMDXタグやcomponent名を変更しないでください。",
    ].join("");
  }

  return [
    "あなたは日本語だけで答えるスライド編集アドバイザーです。",
    "3文以内で、具体的な改善助言だけを返してください。",
    "Markdown全体を書き換えないでください。コードブロック、frontmatter、見出し付きの完全なスライド案、MDXタグは出力しないでください。",
    "既存のMDXタグやcomponent名を変更しないでください。",
  ].join("");
}

function createWorkersAIUserPrompt(payload: AgentSuggestRequest): string {
  const task =
    payload.mode === "chat"
      ? "通常の会話なら自然に返す。スライド相談なら短い日本語の助言だけを返す。Markdown全体を書き換えない。MDXタグは変更しない。"
      : "Markdown全体を書き換えない。現在のデックまたは指定スライドに対する短い日本語の助言だけを返す。MDXタグは変更しない。";
  return [
    task,
    "",
    ...formatConversationContext(payload),
    "",
    `ユーザー入力: ${payload.instruction || "読みやすくする"}`,
    `現在のスライド: ${payload.activeSlide != null ? payload.activeSlide + 1 : "未指定"}`,
    `スライド枚数: ${payload.slideCount ?? "不明"}`,
    "",
    "デック抜粋:",
    payload.markdown.slice(0, 6000),
  ].join("\n");
}

function formatConversationContext(payload: Pick<AgentSuggestRequest, "conversation">): string[] {
  const turns = sanitizeRecentTurns(payload.conversation as DeckAgentChatTurn[] | undefined);
  if (turns.length === 0) return [];
  return [
    "直近の会話:",
    ...turns.map((turn) => `${turn.role === "user" ? "ユーザー" : "アシスタント"}: ${turn.content}`),
  ];
}

function normalizeAISuggestion(response: string): string {
  return response
    .replace(/^#+\s*practical suggestion:?\s*/i, "")
    .replace(/^\*\*practical suggestion:\*\*\s*/i, "")
    .trim();
}

function isUsableAISuggestion(suggestion: string, payload: AgentSuggestRequest): boolean {
  const lower = suggestion.toLowerCase();
  if (suggestion.length > 700) return false;
  if (lower.includes("```")) return false;
  if (/^---\s*$/m.test(suggestion)) return false;
  if (/^#{1,3}\s+/m.test(suggestion)) return false;
  if (/<[A-Za-z][^>]*\/?>/.test(suggestion)) return false;
  if (lower.includes("<ero")) return false;
  if (payload.markdown.trim() && /(未指定|指定されていない|提供されていない|内容を教えて|内容が(?:不明|わかりません)|情報が不足|提示することはできません)/.test(suggestion)) {
    return false;
  }
  return true;
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
      recentConversation: payload.conversation ?? [],
      contextualInstruction: createContextualInstruction(payload),
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
  if (!env.AI) return undefined;
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

function resolveWithin<T>(promise: Promise<T>, timeoutMs: number): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(undefined), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function readString(body: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = body?.[key];
  return typeof value === "string" ? value : undefined;
}

function readNumber(body: Record<string, unknown> | undefined, key: string): number | undefined {
  const value = body?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readBoolean(body: Record<string, unknown> | undefined, key: string): boolean | undefined {
  const value = body?.[key];
  return typeof value === "boolean" ? value : undefined;
}

function createAgentErrorResponse(error: unknown): Response {
  const agentError =
    error instanceof AgentResponseError
      ? error
      : new AgentResponseError(error instanceof Error ? error.message : "Agent chat failed.");
  return Response.json({ error: agentError.message }, { status: agentError.status });
}
