import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vite-plus/test";
import app from "../src/index";

describe("minimal example", () => {
  it("blocks indexing and crawling", async () => {
    const home = await app.request("/");
    const robots = await app.request("/robots.txt");

    expect(home.headers.get("x-robots-tag")).toBe("noindex, nofollow, noarchive");
    expect(await robots.text()).toBe("User-agent: *\nDisallow: /\n");
  });

  it("imports the generated router from the runtime entry", async () => {
    const generated = await readFile(new URL("../src/generated/decks.ts", import.meta.url), "utf8");
    const wranglerConfig = await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8");
    const productionConfig = await readFile(new URL("../wrangler.production.jsonc", import.meta.url), "utf8");
    const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")) as {
      scripts: Record<string, string>;
      dependencies: Record<string, string>;
    };

    expect(generated).toContain('from "hono-decks"');
    expect(generated).not.toContain("hono-decks/runtime");
    expect(packageJson.dependencies["hono-decks"]).toBe("0.1.0");
    expect(packageJson.scripts.dev).toBe("wrangler dev --live-reload");
    expect(packageJson.scripts.deploy).toBe("wrangler deploy");
    expect(packageJson.scripts["deploy:production"]).toContain("wrangler.production.jsonc");
    expect(wranglerConfig).not.toContain("account_id");
    expect(wranglerConfig).not.toContain("hono-decks.com");
    expect(productionConfig).toContain("minimal.hono-decks.com");
  });

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
    const html = await render.text();
    expect(html).toContain("One deck. One facade.");
    expect(html).toContain("One mounted Hono router.");
  });
});
