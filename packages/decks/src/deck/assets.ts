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

  candidates.push(...collectDirectiveAssetCandidates(markdown));
  candidates.push(...collectMarkdownImageCandidates(markdown));

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
  const queryIndex = path.indexOf("?");
  const pathname = (queryIndex === -1 ? path : path.slice(0, queryIndex)).toLowerCase();
  if (hasExtension(pathname, ".png")) return "image/png";
  if (hasExtension(pathname, ".jpg") || hasExtension(pathname, ".jpeg")) return "image/jpeg";
  if (hasExtension(pathname, ".gif")) return "image/gif";
  if (hasExtension(pathname, ".svg")) return "image/svg+xml";
  if (hasExtension(pathname, ".webp")) return "image/webp";
  return undefined;
}

function hasExtension(path: string, extension: string): boolean {
  return path.endsWith(extension) || path.includes(`${extension}#`);
}

function collectDirectiveAssetCandidates(markdown: string): string[] {
  const candidates: string[] = [];
  for (const sourceLine of markdown.split("\n")) {
    const line = sourceLine.endsWith("\r") ? sourceLine.slice(0, -1).trim() : sourceLine.trim();
    const separator = line.indexOf(":");
    if (separator === -1) continue;

    const key = line.slice(0, separator).toLowerCase();
    if (key !== "background" && key !== "image" && key !== "src" && key !== "asset") continue;

    let value = line.slice(separator + 1).trim();
    if (value.startsWith('"') || value.startsWith("'")) value = value.slice(1);
    if (value.endsWith('"') || value.endsWith("'")) value = value.slice(0, -1);
    value = value.trim();
    if (value && !value.includes('"') && !value.includes("'")) candidates.push(value);
  }
  return candidates;
}

function collectMarkdownImageCandidates(markdown: string): string[] {
  const candidates: string[] = [];
  let index = 0;
  while (index < markdown.length - 1) {
    const imageStart = markdown.indexOf("![", index);
    if (imageStart === -1) break;
    const labelEnd = markdown.indexOf("]", imageStart + 2);
    if (labelEnd === -1) break;
    if (markdown[labelEnd + 1] !== "(") {
      index = labelEnd + 1;
      continue;
    }

    let cursor = labelEnd + 2;
    const destinationStart = cursor;
    while (cursor < markdown.length && markdown[cursor] !== ")" && !isMarkdownWhitespace(markdown[cursor])) cursor += 1;
    if (cursor === destinationStart) {
      index = cursor + 1;
      continue;
    }
    const destination = markdown.slice(destinationStart, cursor);

    while (cursor < markdown.length && isMarkdownWhitespace(markdown[cursor])) cursor += 1;
    if (markdown[cursor] !== ")") {
      const quote = markdown[cursor];
      if (quote !== '"' && quote !== "'") {
        index = cursor + 1;
        continue;
      }
      cursor += 1;
      while (cursor < markdown.length && markdown[cursor] !== '"' && markdown[cursor] !== "'") cursor += 1;
      if (cursor >= markdown.length) break;
      cursor += 1;
      while (cursor < markdown.length && isMarkdownWhitespace(markdown[cursor])) cursor += 1;
    }

    if (markdown[cursor] === ")") {
      candidates.push(destination);
      index = cursor + 1;
    } else {
      index = cursor + 1;
    }
  }
  return candidates;
}

function isMarkdownWhitespace(value: string | undefined): boolean {
  return value === " " || value === "\t" || value === "\r" || value === "\n";
}

function assetRefType(value: string): AssetRef["type"] | undefined {
  if (/^https?:\/\//i.test(value)) return "remote";
  if (/^r2:\/\//i.test(value)) return "r2";
  if (value.startsWith("/")) return "public";
  return undefined;
}
