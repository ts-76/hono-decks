export interface R2AssetSmokeResult {
  status: number;
  contentType: string | null;
  cacheControl: string | null;
  assetSource: string | null;
  cfCacheStatus: string | null;
  age: string | null;
}

export function createR2AssetSmokeUrl(origin: string, assetPath?: string): URL;

export function assertR2AssetSmokeResult(result: R2AssetSmokeResult): {
  ok: true;
  observed: {
    status: number;
    contentType: string | null;
    cacheControl: string | null;
    assetSource: string | null;
    cloudflareCache: {
      cfCacheStatus: string;
      age: string;
    };
  };
};

export function summarizeCloudflareCacheHeaders(input: {
  cfCacheStatus: string | null;
  age: string | null;
}): {
  cfCacheStatus: string;
  age: string;
};

export function formatSmokeError(error: unknown): string;
