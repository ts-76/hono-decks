import { describe, expect, it } from "vite-plus/test";

describe("client island helpers", () => {
  it("exports a hono/jsx/dom hydration helper from the client entrypoint", async () => {
    const mod = await import("../src/client");

    expect(typeof mod.hydrateSlideIslands).toBe("function");
  });
});
