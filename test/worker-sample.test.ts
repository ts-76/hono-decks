import { describe, expect, it, vi } from "vitest";

vi.mock("agents", () => ({
  Agent: class {},
  routeAgentRequest: vi.fn(async () => null),
}));
vi.mock("@cloudflare/ai-chat", () => ({
  AIChatAgent: class {},
}));

import app from "../src/index";

describe("sample Worker app", () => {
  it("routes the deployed root to the compiled deck index instead of the legacy editor", async () => {
    const response = await app.request("/");

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/decks");
  });

  it("serves the sample deck with parsed frontmatter, Hero rendering, and the dev chat panel", async () => {
    const response = await app.request("/decks/sample");

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("<title>Hono Slides</title>");
    expect(html).toContain('data-hono-slides-chat');
    expect(html).toContain("/decks/sample/agent/chat");
    expect(html).toContain('src="/decks/sample/presentation"');
    expect(html).not.toContain("<p>title: Hono Slides");
  });

  it("renders the sample presentation with the built-in Hero instead of a placeholder warning", async () => {
    const response = await app.request("/decks/sample/presentation");

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('class="mdx-hero');
    expect(html).toContain("<h1>MDX-like components</h1>");
    expect(html).not.toContain('MDX component "Hero" is rendered as a placeholder.');
    expect(html).not.toContain("mdx-component");
  });

  it("routes the sample deck chat through the Agent chat adapter", async () => {
    const response = await app.request("/decks/sample/agent/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ instruction: "要点を教えて", mode: "chat", activeSlide: 0 }),
    });

    expect(response.status).toBe(200);
    const json = (await response.json()) as { source: string; suggestion: string };
    expect(json).toMatchObject({ source: "heuristic" });
    expect(json.suggestion).toContain("現在 3 枚");
  });

  it("can apply a sample chat edit proposal to the in-memory deck", async () => {
    const chat = await app.request("/decks/sample/agent/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ instruction: "タイトルを変更してみて", mode: "code", activeSlide: 0 }),
    });
    const chatJson = (await chat.json()) as { proposal?: unknown };

    expect(chat.status).toBe(200);
    expect(chatJson.proposal).toBeTruthy();

    const apply = await app.request("/decks/sample/apply", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ proposal: chatJson.proposal }),
    });
    const applyJson = (await apply.json()) as { markdown?: string };

    expect(apply.status).toBe(200);
    expect(applyJson.markdown).toContain("# Hono Slides の概要");
  });

  it("does not expose legacy editing APIs from the sample Worker", async () => {
    expect((await app.request("/deck")).status).toBe(404);
    expect((await app.request("/api/parse", { method: "POST" })).status).toBe(404);
    expect((await app.request("/api/agent/suggest", { method: "POST" })).status).toBe(404);
  });
});
