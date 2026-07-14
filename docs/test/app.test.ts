import { describe, expect, it } from "vitest";
import app from "../app/server";

describe("HonoX documentation site", () => {
  it("renders a code-first home page with guide and API navigation", async () => {
    const response = await app.request("/");
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(html).toContain("Slides belong in");
    expect(html).toContain("A route kit, not another runtime.");
    expect(html).toContain('href="/docs/getting-started"');
    expect(html).toContain('href="/api"');
    expect(html).toContain("app.route(&quot;/decks&quot;");
  });

  it.each([
    ["/docs/getting-started", "最小の構成"],
    ["/docs/authoring", "deck は directory 単位"],
    ["/docs/routing", "既定 route surface"],
    ["/docs/security", "共通 document policy"],
    ["/api", "Runtime entry"],
  ])("renders %s from HonoX file routes", async (path, expected) => {
    const response = await app.request(path);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain(expected);
    expect(html).toContain("Documentation");
    expect(html).toContain('class="docs-layout"');
  });

  it("redirects the documentation root and returns 404 for unknown guides", async () => {
    const docs = await app.request("/docs");
    const missing = await app.request("/docs/unknown");

    expect(docs.status).toBe(302);
    expect(docs.headers.get("location")).toBe("/docs/getting-started");
    expect(missing.status).toBe(404);
  });
});
