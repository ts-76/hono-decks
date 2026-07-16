import { describe, expect, it } from "vite-plus/test";
import { readFile } from "node:fs/promises";
import {
  assertR2AssetSmokeResult,
  createR2AssetSmokeUrl,
  formatSmokeError,
  summarizeCloudflareCacheHeaders,
} from "../scripts/deployed-r2-cache-smoke.mjs";

describe("deployed R2 cache smoke helpers", () => {
  it("builds the default media R2 asset URL from a deployed origin", () => {
    expect(createR2AssetSmokeUrl("https://slides.tslab.app/").toString()).toBe(
      "https://slides.tslab.app/decks/media/assets/r2-remote.svg",
    );
  });

  it("accepts R2-backed responses with long-lived cache headers", () => {
    const result = assertR2AssetSmokeResult({
      status: 200,
      contentType: "image/svg+xml",
      cacheControl: "public, max-age=31536000, immutable",
      assetSource: "r2",
      cfCacheStatus: "HIT",
      age: "42",
    });

    expect(result.ok).toBe(true);
    expect(result.observed.cloudflareCache).toEqual({ cfCacheStatus: "HIT", age: "42" });
  });

  it("rejects embedded fallback responses for the deployed R2 smoke", () => {
    expect(() =>
      assertR2AssetSmokeResult({
        status: 200,
        contentType: "image/svg+xml",
        cacheControl: "public, max-age=300",
        assetSource: "embedded",
        cfCacheStatus: null,
        age: null,
      }),
    ).toThrow("expected x-hono-decks-asset-source to be r2");
  });

  it("summarizes Cloudflare cache headers without requiring a cache hit", () => {
    expect(summarizeCloudflareCacheHeaders({ cfCacheStatus: null, age: null })).toEqual({
      cfCacheStatus: "missing",
      age: "missing",
    });
  });

  it("formats custom domain DNS provisioning failures without a stack trace", () => {
    const error = new TypeError("fetch failed", {
      cause: { code: "ENOTFOUND", hostname: "hono-decks-basic.tslab.app" },
    });

    expect(formatSmokeError(error)).toBe(
      "Deployed R2 cache smoke failed: DNS lookup failed for hono-decks-basic.tslab.app. The Custom Domain may still be provisioning.",
    );
  });

  it("documents the deployed R2 binding in the sample Wrangler config", async () => {
    const config = await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8");

    expect(config).toContain('"r2_buckets"');
    expect(config).toContain('"binding": "DECK_ASSETS"');
    expect(config).toContain('"bucket_name": "hono-decks-basic-assets"');
    expect(config).toContain('"routes"');
    expect(config).toContain('"pattern": "hono-decks-basic.tslab.app"');
    expect(config).toContain('"custom_domain": true');
  });
});
