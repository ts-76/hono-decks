/** Set this once the public, single-Worker sample repository is available. */
export const DEPLOY_SAMPLE_REPOSITORY_URL: string | undefined = undefined;

export function deployToCloudflareUrl(): string | undefined {
  return DEPLOY_SAMPLE_REPOSITORY_URL
    ? `https://deploy.workers.cloudflare.com/?url=${encodeURIComponent(DEPLOY_SAMPLE_REPOSITORY_URL)}`
    : undefined;
}
