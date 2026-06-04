import { Agent } from "agents";
import type { AgentSuggestRequest, AgentSuggestResponse, Env } from "./types";

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
