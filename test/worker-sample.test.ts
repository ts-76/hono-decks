import { describe, expect, it, vi } from "vitest";

vi.mock("agents", () => ({
  Agent: class {},
  routeAgentRequest: vi.fn(async () => null),
}));

import app from "../src/index";

describe("sample Worker app", () => {
  it("routes the deployed root to the compiled deck index instead of the legacy editor", async () => {
    const response = await app.request("/");

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/decks");
  });

  it("serves the sample deck with parsed deck frontmatter", async () => {
    const response = await app.request("/decks/sample");

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("<title>Hono Slides</title>");
    expect(html).not.toContain("<p>title: Hono Slides");
  });

  it("does not expose legacy editing APIs from the production sample Worker", async () => {
    expect((await app.request("/deck")).status).toBe(404);
    expect((await app.request("/api/parse", { method: "POST" })).status).toBe(404);
    expect((await app.request("/api/agent/suggest", { method: "POST" })).status).toBe(404);
  });
});
