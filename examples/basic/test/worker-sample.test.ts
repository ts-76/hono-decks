import { describe, expect, it } from "vitest";
import { Badge } from "../decks/sample/components";
import { deckComponents } from "../src/generated/deck-components";
import { deckManifest } from "../src/generated/deck-manifest";

async function sampleApp() {
  return (await import("../src/index")).default;
}

describe("sample Worker app", () => {
  it("uses a directory-based sample deck manifest", () => {
    expect(deckManifest.decks).toHaveLength(1);
    expect(deckManifest.decks[0]?.slug).toBe("sample");
    expect(deckManifest.decks[0]?.sourcePath).toBe("decks/sample/deck.mdx");
    expect(deckManifest.decks[0]?.kind).toBe("directory");
  });

  it("exports slide components from the sample deck directory", () => {
    expect(typeof Badge).toBe("function");
    expect(Object.keys(deckComponents)).toEqual([expect.stringMatching(/^Badge__sample_[a-z0-9]+$/)]);
  });

  it("routes the deployed root to the compiled deck index", async () => {
    const app = await sampleApp();
    const response = await app.request("/");

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/decks");
  });

  it("serves the sample deck as a public viewer without edit controls", async () => {
    const app = await sampleApp();
    const response = await app.request("/decks/sample");

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("<title>Hono Slides</title>");
    expect(html).toContain('src="/decks/sample/render"');
    expect(html).toContain('data-action="previous"');
    expect(html).toContain('data-action="next"');
    expect(html).toContain('data-action="fullscreen"');
    expect(html).not.toContain("/decks/sample/edit");
    expect(html).not.toContain("/agent/chat");
    expect(html).not.toContain("/apply");
  });

  it("renders the sample deck with the built-in Hero instead of a placeholder warning", async () => {
    const app = await sampleApp();
    const response = await app.request("/decks/sample/render");

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('class="mdx-hero');
    expect(html).toContain("<h1>MDX-like components</h1>");
    expect(html).toContain('class="sample-badge"');
    expect(html).toContain("Rendered by a Hono JSX component");
    expect(html).not.toContain('MDX component "Hero" is rendered as a placeholder.');
    expect(html).not.toContain("mdx-component");
  });

  it("does not expose edit or legacy editing APIs from the sample Worker", async () => {
    const app = await sampleApp();

    expect((await app.request("/decks/sample/edit")).status).toBe(404);
    expect((await app.request("/decks/sample/edit/agent/chat", { method: "POST" })).status).toBe(404);
    expect((await app.request("/decks/sample/edit/apply", { method: "POST" })).status).toBe(404);
    expect((await app.request("/deck")).status).toBe(404);
    expect((await app.request("/api/parse", { method: "POST" })).status).toBe(404);
    expect((await app.request("/api/agent/suggest", { method: "POST" })).status).toBe(404);
  });
});
