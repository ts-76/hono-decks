#!/usr/bin/env node

const DEFAULT_ASSET_PATH = "/decks/media/assets/r2-remote.svg";
const EXPECTED_CACHE_CONTROL = "public, max-age=31536000, immutable";

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}

export function createR2AssetSmokeUrl(origin, assetPath = DEFAULT_ASSET_PATH) {
  if (!origin) {
    throw new Error(
      "Missing deployed origin. Set HONO_DECKS_DEPLOYED_ORIGIN or pass --origin https://hono-decks-basic.tslab.app",
    );
  }
  const url = new URL(origin);
  url.pathname = joinUrlPath(url.pathname, assetPath);
  url.search = "";
  url.hash = "";
  return url;
}

export function assertR2AssetSmokeResult(result) {
  const failures = [];
  if (result.status !== 200) failures.push(`expected HTTP 200, got ${result.status}`);
  if (!result.contentType?.includes("image/svg+xml")) {
    failures.push(`expected content-type to include image/svg+xml, got ${result.contentType ?? "missing"}`);
  }
  if (result.cacheControl !== EXPECTED_CACHE_CONTROL) {
    failures.push(`expected cache-control to be ${EXPECTED_CACHE_CONTROL}, got ${result.cacheControl ?? "missing"}`);
  }
  if (result.assetSource !== "r2") {
    failures.push(`expected x-hono-decks-asset-source to be r2, got ${result.assetSource ?? "missing"}`);
  }
  if (failures.length) {
    throw new Error(`Deployed R2 cache smoke failed: ${failures.join("; ")}`);
  }

  return {
    ok: true,
    observed: {
      status: result.status,
      contentType: result.contentType,
      cacheControl: result.cacheControl,
      assetSource: result.assetSource,
      cloudflareCache: summarizeCloudflareCacheHeaders(result),
    },
  };
}

export function summarizeCloudflareCacheHeaders(input) {
  return {
    cfCacheStatus: input.cfCacheStatus ?? "missing",
    age: input.age ?? "missing",
  };
}

export function formatSmokeError(error) {
  const cause = error?.cause;
  if (cause?.code === "ENOTFOUND") {
    return `Deployed R2 cache smoke failed: DNS lookup failed for ${cause.hostname}. The Custom Domain may still be provisioning.`;
  }
  return error instanceof Error ? error.message : String(error);
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const origin = options.origin ?? process.env.HONO_DECKS_DEPLOYED_ORIGIN;
    const assetPath = options.assetPath ?? process.env.HONO_DECKS_R2_SMOKE_ASSET_PATH ?? DEFAULT_ASSET_PATH;
    const url = createR2AssetSmokeUrl(origin, assetPath);

    const first = await fetchAsset(url);
    const second = await fetchAsset(url);
    const result = assertR2AssetSmokeResult(second);

    console.log("Deployed R2 cache smoke: ok");
    console.log(JSON.stringify({
      url: url.toString(),
      first: {
        status: first.status,
        cloudflareCache: summarizeCloudflareCacheHeaders(first),
      },
      second: result.observed,
    }, null, 2));
  } catch (error) {
    console.error(formatSmokeError(error));
    process.exitCode = 1;
  }
}

async function fetchAsset(url) {
  const response = await fetch(url, {
    headers: {
      "cache-control": "no-cache",
    },
  });
  await response.arrayBuffer();
  return {
    status: response.status,
    contentType: response.headers.get("content-type"),
    cacheControl: response.headers.get("cache-control"),
    assetSource: response.headers.get("x-hono-decks-asset-source"),
    cfCacheStatus: response.headers.get("cf-cache-status"),
    age: response.headers.get("age"),
  };
}

function parseArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--origin") {
      options.origin = args[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--asset") {
      options.assetPath = args[index + 1];
      index += 1;
      continue;
    }
    if (!arg.startsWith("--") && !options.origin) {
      options.origin = arg;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function joinUrlPath(basePath, assetPath) {
  const cleanBase = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
  const cleanAsset = assetPath.startsWith("/") ? assetPath : `/${assetPath}`;
  return `${cleanBase}${cleanAsset}`;
}
