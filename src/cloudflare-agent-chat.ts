import type { Context } from "hono";
import type { DeckAgentChatResult } from "./agent-contract";
import type { HonoSlidesAgentChatInput } from "./router";

export type RouteAgentRequest = (request: Request, env: unknown) => Promise<Response | null>;

export interface CreateCloudflareDeckAgentChatInput {
  agentPath?: string;
  routeAgentRequest: RouteAgentRequest;
  fallback?(
    input: HonoSlidesAgentChatInput,
    c: Context,
  ): Promise<DeckAgentChatResult | Response> | DeckAgentChatResult | Response;
}

export function createCloudflareDeckAgentChat(input: CreateCloudflareDeckAgentChatInput) {
  const agentPath = normalizeAgentPath(input.agentPath ?? "slide-assistant");

  return async (chatInput: HonoSlidesAgentChatInput, c: Context): Promise<DeckAgentChatResult | Response> => {
    const agentUrl = new URL(
      `/agents/${agentPath}/${encodeURIComponent(chatInput.agentInstanceName)}/chat`,
      c.req.url,
    );
    const response = await input.routeAgentRequest(
      new Request(agentUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(chatInput),
      }),
      c.env,
    );

    if (response) return response.json() as Promise<DeckAgentChatResult>;
    if (input.fallback) return input.fallback(chatInput, c);

    return Response.json({ error: "Agent route was not handled" }, { status: 501 });
  };
}

function normalizeAgentPath(value: string): string {
  return value.replace(/^\/+/, "").replace(/\/+$/, "");
}
