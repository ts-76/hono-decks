import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vite-plus/test";
import app from "../app/server";

describe("HonoX example", () => {
  it("allows the public portfolio to be indexed", async () => {
    const home = await app.request("/");
    const robots = await app.request("/robots.txt");

    expect(home.headers.get("x-robots-tag")).toBeNull();
    expect(await robots.text()).toBe("User-agent: *\nAllow: /\n");
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
    expect(html).toContain('src="/decks/honox/embed"');
    expect(html).toContain("Talks built close to the code.");
  });

  it("mounts the generated deck router from a file route", async () => {
    const index = await app.request("/decks");
    const viewer = await app.request("/decks/honox");
    const render = await app.request("/decks/honox/render");
    const embed = await app.request("/decks/honox/embed");

    expect(index.status).toBe(200);
    const indexHtml = await index.text();
    expect(indexHtml).toContain("<title>Talk archive — ts-76 Talks</title>");
    expect(indexHtml).toContain('id="honox-deck-index-css"');
    expect(indexHtml).toContain('class="archive-hero"');
    expect(indexHtml).toContain('id="published-talks"');
    expect(indexHtml).toContain("HonoX Deck");
    expect(indexHtml).toContain('src="/decks/honox/embed"');
    expect(indexHtml).toContain('href="/decks/honox/presentation"');
    expect(indexHtml).toContain('href="/decks/honox/print"');
    expect(viewer.status).toBe(200);
    expect(await viewer.text()).toContain('src="/decks/honox/render"');
    expect(render.status).toBe(200);
    expect(await render.text()).toContain("Pages and presentations,");
    expect(embed.status).toBe(200);
    expect(embed.headers.get("content-security-policy")).toBe("frame-ancestors 'self' https://hono-decks.com");
  });
});
