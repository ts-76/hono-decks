import type { Context } from "hono";
import type { DeckAgentChatResult } from "./agent-contract";
import type { HonoSlidesAgentChatInput } from "./router";

export type RouteAgentRequest = (request: Request, env: unknown) => Promise<Response | null>;

export interface CreateCloudflareDeckAgentChatInput {
  agentPath?: string;
  routeTimeoutMs?: number;
  routeAgentRequest: RouteAgentRequest;
  fallback?(
    input: HonoSlidesAgentChatInput,
    c: Context,
  ): Promise<DeckAgentChatResult | Response> | DeckAgentChatResult | Response;
}

export function createCloudflareDeckAgentChat(input: CreateCloudflareDeckAgentChatInput) {
  const agentPath = normalizeAgentPath(input.agentPath ?? "slide-assistant");
  const routeTimeoutMs = input.routeTimeoutMs ?? 20_000;

  return async (chatInput: HonoSlidesAgentChatInput, c: Context): Promise<DeckAgentChatResult | Response> => {
    const agentUrl = new URL(
      `/agents/${agentPath}/${encodeURIComponent(chatInput.agentInstanceName)}/chat`,
      c.req.url,
    );
    let response: Response | null | undefined;
    try {
      response = await resolveWithin(
        input.routeAgentRequest(
          new Request(agentUrl, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(chatInput),
          }),
          c.env,
        ),
        routeTimeoutMs,
      );
    } catch {
      if (input.fallback) return input.fallback(chatInput, c);
      return Response.json({ error: "Agent route failed" }, { status: 502 });
    }

    if (response === undefined) {
      if (input.fallback) return input.fallback(chatInput, c);
      return Response.json({ error: "Agent route timed out" }, { status: 504 });
    }

    if (response) {
      if (!response.ok) return response;
      return response.json() as Promise<DeckAgentChatResult>;
    }
    if (input.fallback) return input.fallback(chatInput, c);

    return Response.json({ error: "Agent route was not handled" }, { status: 501 });
  };
}

function normalizeAgentPath(value: string): string {
  return value.replace(/^\/+/, "").replace(/\/+$/, "");
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
