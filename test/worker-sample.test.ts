import { describe, expect, it, vi } from "vitest";

vi.mock("agents", () => ({
  Agent: class {},
  routeAgentRequest: vi.fn(async () => null),
}));

import app from "../src/index";

describe("sample Worker app", () => {
  it("serves the sample deck with parsed deck frontmatter", async () => {
    const response = await app.request("/decks/sample");

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("<title>Hono Slides</title>");
    expect(html).not.toContain("<p>title: Hono Slides");
  });
});
