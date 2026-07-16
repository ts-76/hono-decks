import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vite-plus/test";
import app from "../src/index";
import { OGP_HEIGHT, OGP_WIDTH } from "../scripts/ogp-card";

describe("OGP example", () => {
  it("builds with the published package", async () => {
    const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")) as {
      scripts: Record<string, string>;
      dependencies: Record<string, string>;
    };
    const wranglerConfig = await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8");
    const productionConfig = await readFile(new URL("../wrangler.production.jsonc", import.meta.url), "utf8");

    expect(packageJson.dependencies["hono-decks"]).toBe("0.1.0");
    expect(Object.values(packageJson.scripts).join(" ")).not.toContain("../../packages/decks");
    expect(wranglerConfig).not.toContain('"alias"');
    expect(wranglerConfig).not.toContain("account_id");
    expect(wranglerConfig).not.toContain("hono-decks.com");
    expect(productionConfig).toContain("ogp.hono-decks.com");
  });

  it("blocks indexing and crawling", async () => {
    const home = await app.request("/");
    const robots = await app.request("/robots.txt");

    expect(home.headers.get("x-robots-tag")).toBe("noindex, nofollow, noarchive");
    expect(await robots.text()).toBe("User-agent: *\nDisallow: /\n");
  });

  it("emits absolute social metadata for the generated image", async () => {
    const html = await (await app.request("https://slides.example/decks/welcome")).text();

    expect(html).toContain('<meta property="og:image" content="https://slides.example/decks/welcome/og.png" />');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
  });

  it("generates a 1200 by 630 PNG", async () => {
    const png = await readFile(new URL("../public/decks/welcome/og.png", import.meta.url));

    expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    expect(png.readUInt32BE(16)).toBe(OGP_WIDTH);
    expect(png.readUInt32BE(20)).toBe(OGP_HEIGHT);
  });
});
