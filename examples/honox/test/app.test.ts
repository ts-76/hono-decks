import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vite-plus/test";
import app from "../app/server";

describe("HonoX example", () => {
  it("blocks indexing and crawling", async () => {
    const home = await app.request("/");
    const robots = await app.request("/robots.txt");

    expect(home.headers.get("x-robots-tag")).toBe("noindex, nofollow, noarchive");
    expect(await robots.text()).toBe("User-agent: *\nDisallow: /\n");
  });

  it("uses the generated runtime entry and compiles through the Vite lifecycle", async () => {
    const generated = await readFile(new URL("../app/generated/decks.ts", import.meta.url), "utf8");
    const viteConfig = await readFile(new URL("../vite.config.ts", import.meta.url), "utf8");
    const wranglerConfig = await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8");
    const productionConfig = await readFile(new URL("../wrangler.production.jsonc", import.meta.url), "utf8");
    const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")) as {
      scripts: Record<string, string>;
      dependencies: Record<string, string>;
    };

    expect(generated).toContain('from "hono-decks"');
    expect(generated).not.toContain("hono-decks/runtime");
    expect(viteConfig).not.toContain("alias");
    expect(viteConfig).toContain('from "hono-decks/vite"');
    expect(viteConfig).toContain("honoDecks()");
    expect(packageJson.dependencies["hono-decks"]).toBe("0.1.0");
    expect(packageJson.scripts["decks:compile"]).toBe("hono-decks compile");
    expect(packageJson.scripts.dev).toBe("node ../../scripts/run-with-typescript-parser.cjs vp dev");
    expect(packageJson.scripts.build).toBe("node ../../scripts/run-with-typescript-parser.cjs vp build");
    expect(packageJson.scripts.dev).not.toContain("decks:compile");
    expect(packageJson.scripts.dev).not.toContain("../../packages/decks");
    expect(packageJson.scripts["decks:watch"]).toBeUndefined();
    expect(wranglerConfig).not.toContain("account_id");
    expect(wranglerConfig).not.toContain("hono-decks.com");
    expect(productionConfig).toContain("honox.hono-decks.com");
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
