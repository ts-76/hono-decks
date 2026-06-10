import { describe, expect, it } from "vitest";
import { createCloudflareDeckAgentChat } from "../src/cloudflare-agent-chat";

describe("createCloudflareDeckAgentChat", () => {
  it("routes deck chat input to the per-deck session Agent instance", async () => {
    const routed: Array<{ url: string; body: unknown; env: unknown }> = [];
    const agentChat = createCloudflareDeckAgentChat({
      agentPath: "slide-assistant",
      routeAgentRequest: async (request, env) => {
        routed.push({ url: request.url, body: await request.json(), env });
        return Response.json({ source: "agent", suggestion: "Use a stronger title." });
      },
    });

    const response = await agentChat(
      {
        slug: "deck1",
        sessionId: "session-1",
        agentInstanceName: "deck-5-deck1-session-9-session-1",
        mode: "code",
        baseMarkdownHash: "mdx-b5765d09",
        markdown: "# Raw Deck",
        instruction: "Improve this",
        activeSlide: 0,
      },
      {
        req: { url: "https://slides.example.test/decks/deck1/agent/chat" },
        env: { SlideAssistant: "binding" },
      } as never,
    );

    expect(response).toEqual({ source: "agent", suggestion: "Use a stronger title." });
    expect(routed).toEqual([
      {
        url: "https://slides.example.test/agents/slide-assistant/deck-5-deck1-session-9-session-1/chat",
        env: { SlideAssistant: "binding" },
        body: {
          slug: "deck1",
          sessionId: "session-1",
          agentInstanceName: "deck-5-deck1-session-9-session-1",
          mode: "code",
          baseMarkdownHash: "mdx-b5765d09",
          markdown: "# Raw Deck",
          instruction: "Improve this",
          activeSlide: 0,
        },
      },
    ]);
  });

  it("returns an error when the Agent route is not handled", async () => {
    const agentChat = createCloudflareDeckAgentChat({
      agentPath: "slide-assistant",
      routeAgentRequest: async () => null,
    });

    const result = await agentChat(
      {
        slug: "deck1",
        sessionId: "default",
        agentInstanceName: "deck-5-deck1-session-7-default",
        mode: "chat",
        baseMarkdownHash: "mdx-b5765d09",
        markdown: "# Raw Deck",
        instruction: "",
      },
      { req: { url: "https://slides.example.test/decks/deck1/agent/chat" }, env: {} } as never,
    );

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(501);
    await expect((result as Response).json()).resolves.toEqual({ error: "Agent route was not handled" });
  });

  it("preserves Workers AI intent for localhost Agent requests", async () => {
    let routedBody: unknown;
    const agentChat = createCloudflareDeckAgentChat({
      agentPath: "slide-assistant",
      routeAgentRequest: async (request) => {
        routedBody = await request.json();
        return Response.json({ source: "agent", suggestion: "Agent response" });
      },
    });

    await agentChat(
      {
        slug: "deck1",
        sessionId: "default",
        agentInstanceName: "deck-5-deck1-session-7-default",
        mode: "chat",
        baseMarkdownHash: "mdx-b5765d09",
        markdown: "# Raw Deck",
        instruction: "",
        useWorkersAI: true,
      },
      { req: { url: "http://localhost:8787/decks/deck1/agent/chat" }, env: {} } as never,
    );

    expect(routedBody).toMatchObject({ useWorkersAI: true });
  });

  it("returns an error when the Agent route throws", async () => {
    const agentChat = createCloudflareDeckAgentChat({
      agentPath: "slide-assistant",
      routeAgentRequest: async () => {
        throw new Error("Binding AI needs to be run remotely");
      },
    });

    const result = await agentChat(
      {
        slug: "deck1",
        sessionId: "default",
        agentInstanceName: "deck-5-deck1-session-7-default",
        mode: "chat",
        baseMarkdownHash: "mdx-b5765d09",
        markdown: "# Raw Deck",
        instruction: "",
      },
      { req: { url: "https://slides.example.test/decks/deck1/agent/chat" }, env: {} } as never,
    );

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(502);
    await expect((result as Response).json()).resolves.toEqual({ error: "Agent route failed" });
  });

  it("returns an error when the Agent route does not respond", async () => {
    const agentChat = createCloudflareDeckAgentChat({
      agentPath: "slide-assistant",
      routeTimeoutMs: 1,
      routeAgentRequest: async () => new Promise<Response | null>(() => undefined),
    });

    const result = await agentChat(
      {
        slug: "deck1",
        sessionId: "default",
        agentInstanceName: "deck-5-deck1-session-7-default",
        mode: "chat",
        baseMarkdownHash: "mdx-b5765d09",
        markdown: "# Raw Deck",
        instruction: "",
      },
      { req: { url: "https://slides.example.test/decks/deck1/agent/chat" }, env: {} } as never,
    );

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(504);
    await expect((result as Response).json()).resolves.toEqual({ error: "Agent route timed out" });
  });

  it("passes through non-ok Agent responses without converting them to chat results", async () => {
    const agentChat = createCloudflareDeckAgentChat({
      agentPath: "slide-assistant",
      routeAgentRequest: async () => Response.json({ error: "Agent failed" }, { status: 503 }),
    });

    const result = await agentChat(
      {
        slug: "deck1",
        sessionId: "default",
        agentInstanceName: "deck-5-deck1-session-7-default",
        mode: "chat",
        baseMarkdownHash: "mdx-b5765d09",
        markdown: "# Raw Deck",
        instruction: "",
      },
      { req: { url: "https://slides.example.test/decks/deck1/agent/chat" }, env: {} } as never,
    );

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(503);
    await expect((result as Response).json()).resolves.toEqual({ error: "Agent failed" });
  });

  it("returns a 501 response when no Agent route handles the request", async () => {
    const agentChat = createCloudflareDeckAgentChat({
      agentPath: "slide-assistant",
      routeAgentRequest: async () => null,
    });

    const result = await agentChat(
      {
        slug: "deck1",
        sessionId: "default",
        agentInstanceName: "deck-5-deck1-session-7-default",
        mode: "chat",
        baseMarkdownHash: "mdx-b5765d09",
        markdown: "# Raw Deck",
        instruction: "",
      },
      { req: { url: "https://slides.example.test/decks/deck1/agent/chat" }, env: {} } as never,
    );

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(501);
    await expect((result as Response).json()).resolves.toEqual({ error: "Agent route was not handled" });
  });
});
