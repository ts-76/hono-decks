import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import app from "../src/index";
import { OGP_HEIGHT, OGP_WIDTH } from "../scripts/ogp-card";

describe("OGP example", () => {
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
