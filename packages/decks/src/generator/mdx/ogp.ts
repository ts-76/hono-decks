export interface LinkCardOgpMetadata {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

export async function resolveLinkCardMetadataByUrl(
  source: string,
  resolveOgp: ((url: string) => Promise<LinkCardOgpMetadata | undefined>) | undefined,
): Promise<Map<string, LinkCardOgpMetadata>> {
  const result = new Map<string, LinkCardOgpMetadata>();
  if (!resolveOgp) return result;

  for (const url of collectLinkCardUrls(source)) {
    try {
      const metadata = await resolveOgp(url);
      if (metadata) result.set(url, metadata);
    } catch {
      // OGP fetch is best-effort; keep the link card fallback when metadata cannot be resolved.
    }
  }
  return result;
}

function collectLinkCardUrls(source: string): string[] {
  const urls = new Set<string>();
  const pattern = /@\[card\]\(([^)\s]+)\)/g;
  for (const match of source.matchAll(pattern)) {
    urls.add(match[1]);
  }
  return [...urls];
}
