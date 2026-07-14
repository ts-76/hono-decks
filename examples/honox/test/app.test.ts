import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import app from "../app/server";

describe("HonoX example", () => {
  it("uses the generated runtime entry and compiles through the Vite lifecycle", async () => {
    const generated = await readFile(new URL("../app/generated/decks.ts", import.meta.url), "utf8");
    const viteConfig = await readFile(new URL("../vite.config.ts", import.meta.url), "utf8");
    const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(generated).toContain('from "hono-decks"');
    expect(generated).not.toContain("hono-decks/runtime");
    expect(viteConfig).not.toContain("alias");
    expect(viteConfig).toContain('from "hono-decks/vite"');
    expect(viteConfig).toContain("honoDecks()");
    expect(packageJson.scripts.dev).toMatch(/vite$/);
    expect(packageJson.scripts.dev).not.toContain("decks:compile");
    expect(packageJson.scripts["decks:watch"]).toBeUndefined();
  });

  it("renders the HonoX home route", async () => {
    const response = await app.request("/");
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("HonoX + hono-decks");
    expect(html).toContain('href="/decks/honox"');
  });

  it("mounts the generated deck router from a file route", async () => {
    const index = await app.request("/decks");
    const viewer = await app.request("/decks/honox");
    const render = await app.request("/decks/honox/render");

    expect(index.status).toBe(200);
    expect(await index.text()).toContain("HonoX Deck");
    expect(viewer.status).toBe(200);
    expect(await viewer.text()).toContain('src="/decks/honox/render"');
    expect(render.status).toBe(200);
    expect(await render.text()).toContain("File-based pages and generated slide routes in one Hono app.");
  });
});
