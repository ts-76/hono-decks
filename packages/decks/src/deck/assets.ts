import type { AssetRef, CompiledDeck } from "./model";

export function buildExternalAssetRefs(candidates: string[]): AssetRef[] {
  const refs = new Map<string, AssetRef>();
  for (const candidate of candidates) {
    const type = assetRefType(candidate);
    if (!type || refs.has(candidate)) continue;
    const contentType = contentTypeForPath(candidate);
    refs.set(candidate, {
      sourcePath: candidate,
      publicPath: candidate,
      type,
      ...(contentType ? { contentType } : {}),
    });
  }
  return [...refs.values()];
}

export function addExternalAssetWarnings(warnings: CompiledDeck["warnings"], assets: AssetRef[]): void {
  for (const asset of assets) {
    if (asset.type !== "remote" && asset.type !== "r2") continue;
    const label = asset.type === "r2" ? "R2" : "Remote";
    warnings.push({
      code: "external-asset-unverified",
      message: `${label} asset existence cannot be verified at compile time: ${asset.sourcePath}`,
    });
  }
}

export function collectMarkdownAssetCandidates(markdown: string): string[] {
  const candidates: string[] = [];

  for (const match of markdown.matchAll(/^\s*(?:background|image|src|asset):\s*['"]?([^'"\n]+)['"]?\s*$/gim)) {
    candidates.push(match[1].trim());
  }

  for (const match of markdown.matchAll(/!\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g)) {
    candidates.push(match[1].trim());
  }

  for (const match of markdown.matchAll(/\b(?:src|href|image|background)=["']([^"']+)["']/g)) {
    candidates.push(match[1].trim());
  }

  return candidates;
}

export function collectFrontmatterAssetCandidates(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value === "string") return [value.trim()].filter(Boolean);
  return [];
}

export function isLocalRelativeAssetCandidate(value: string): boolean {
  if (assetRefType(value)) return false;
  if (value.startsWith("./") || value.startsWith("../")) return true;
  return /^[^/:?#]+\.(?:png|jpe?g|gif|svg|webp)(?:[?#].*)?$/i.test(value);
}

export function contentTypeForPath(path: string): string | undefined {
  const pathname = path.replace(/\?.*$/, "").toLowerCase();
  if (/\.png(?:#.*)?$/.test(pathname)) return "image/png";
  if (/\.jpe?g(?:#.*)?$/.test(pathname)) return "image/jpeg";
  if (/\.gif(?:#.*)?$/.test(pathname)) return "image/gif";
  if (/\.svg(?:#.*)?$/.test(pathname)) return "image/svg+xml";
  if (/\.webp(?:#.*)?$/.test(pathname)) return "image/webp";
  return undefined;
}

function assetRefType(value: string): AssetRef["type"] | undefined {
  if (/^https?:\/\//i.test(value)) return "remote";
  if (/^r2:\/\//i.test(value)) return "r2";
  if (value.startsWith("/")) return "public";
  return undefined;
}
