import { describe, expect, it } from "vitest";
import app from "../src/index";

describe("minimal example", () => {
  it("redirects the home page to the only deck", async () => {
    const response = await app.request("/");

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/decks/welcome");
  });

  it("serves the generated deck router", async () => {
    const index = await app.request("/decks");
    const viewer = await app.request("/decks/welcome");
    const render = await app.request("/decks/welcome/render");

    expect(index.status).toBe(200);
    expect(await index.text()).toContain("Minimal Hono Deck");
    expect(viewer.status).toBe(200);
    expect(await viewer.text()).toContain('src="/decks/welcome/render"');
    expect(render.status).toBe(200);
    expect(await render.text()).toContain("One deck, one facade, one mounted Hono router.");
  });
});
