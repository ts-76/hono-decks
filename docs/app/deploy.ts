/** Cloudflare treats this subdirectory as the root of the cloned sample repository. */
export const DEPLOY_SAMPLE_REPOSITORY_URL: string | undefined =
  "https://github.com/ts-76/hono-decks/tree/main/examples/minimal";

export function deployToCloudflareUrl(): string | undefined {
  return DEPLOY_SAMPLE_REPOSITORY_URL
    ? `https://deploy.workers.cloudflare.com/?url=${encodeURIComponent(DEPLOY_SAMPLE_REPOSITORY_URL)}`
    : undefined;
}
