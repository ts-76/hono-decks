import { Hono } from "hono";
import { describe, expect, it } from "vite-plus/test";
import { manifestDeckSource } from "../src/source/manifest-source";
import { decksRouter, X_PLAYER_FRAME_ANCESTORS } from "../src/server/router";
import { deck } from "./support/router-fixtures";

function appFor(options: Partial<Parameters<typeof decksRouter>[0]>) {
  const app = new Hono();
  app.route("/slides", decksRouter({ source: manifestDeckSource({ decks: [deck] }), ...options }));
  return app;
}

describe("X Player Card", () => {
  it("points the card at the absolute embed route with the default 16:9 size", async () => {
    const app = appFor({ embed: {}, viewer: { openGraph: { twitterPlayer: true } } });
    const html = await (await app.request("https://slides.example/slides/deck1")).text();

    expect(html).toContain('<meta name="twitter:card" content="player" />');
    expect(html).toContain('<meta name="twitter:player" content="https://slides.example/slides/deck1/embed" />');
    expect(html).toContain('<meta name="twitter:player:width" content="1280" />');
    expect(html).toContain('<meta name="twitter:player:height" content="720" />');
    expect(html).toContain('<meta name="twitter:image" content="https://slides.example/slides/deck1/og.png" />');
    expect(html).not.toContain("summary_large_image");
  });

  it("accepts a custom player size", async () => {
    const app = appFor({ embed: {}, viewer: { openGraph: { twitterPlayer: { width: 960, height: 600 } } } });
    const html = await (await app.request("https://slides.example/slides/deck1")).text();
    expect(html).toContain('<meta name="twitter:player:width" content="960" />');
    expect(html).toContain('<meta name="twitter:player:height" content="600" />');
  });

  it("keeps the large image card unless the player is enabled", async () => {
    const html = await (await appFor({ embed: {}, viewer: { openGraph: true } }).request("/slides/deck1")).text();
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
    expect(html).not.toContain("twitter:player");
  });

  it("lets X frame the embed route in addition to configured origins", async () => {
    const app = appFor({
      embed: { frameAncestors: ["https://blog.example"] },
      viewer: { openGraph: { twitterPlayer: true } },
    });
    const csp = (await app.request("/slides/deck1/embed")).headers.get("content-security-policy");
    expect(csp).toBe(`frame-ancestors 'self' https://blog.example ${X_PLAYER_FRAME_ANCESTORS.join(" ")}`);

    const withoutPlayer = appFor({ embed: {} });
    expect((await withoutPlayer.request("/slides/deck1/embed")).headers.get("content-security-policy")).toBe(
      "frame-ancestors 'self'",
    );
  });

  it("keeps CSP host wildcards so X's wrapper frames on subdomains are allowed", async () => {
    const app = appFor({ embed: { frameAncestors: ["https://*.blog.example", "https://*", "javascript:*"] } });
    const csp = (await app.request("/slides/deck1/embed")).headers.get("content-security-policy");
    expect(csp).toBe("frame-ancestors 'self' https://*.blog.example");
    expect(X_PLAYER_FRAME_ANCESTORS).toEqual(expect.arrayContaining(["https://*.x.com", "https://*.twitter.com"]));
  });

  it("fails fast when the embed route the card needs is disabled", () => {
    expect(() => appFor({ viewer: { openGraph: { twitterPlayer: true } } })).toThrow(
      "viewer.openGraph.twitterPlayer needs the embed option",
    );
  });
});
